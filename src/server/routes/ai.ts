import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import {
  compareDescriptionMatch,
  detectDuplicateReports,
  generateCaseSummary,
  analyzeLocationIntelligence,
} from '../services/aiService.ts';

export const aiRouter = Router();

// AI Assisted Description Matching
aiRouter.post(
  '/match-description',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { caseId, sightingDescription } = req.body;

      if (!caseId || !sightingDescription) {
        res.status(400).json({ error: 'caseId and sightingDescription are required.' });
        return;
      }

      const targetCase = db.getCaseById(caseId);
      if (!targetCase) {
        res.status(404).json({ error: `Case ${caseId} not found.` });
        return;
      }

      const user = req.user!;
      const result = await compareDescriptionMatch(
        {
          fullName: targetCase.person.fullName,
          age: targetCase.person.age,
          gender: targetCase.person.gender,
          physicalDescription: targetCase.person.physicalDescription,
          clothingDescription: targetCase.person.clothingDescription,
          identifyingMarks: targetCase.person.identifyingMarks,
        },
        sightingDescription
      );

      db.addAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'AI_MATCH_ANALYSIS_EXECUTED',
        resourceType: 'CASE',
        resourceId: caseId,
        details: `Ran AI description analysis for case ${caseId}. Confidence: ${result.matchConfidence} (${result.similarityPercentage}%).`,
        result: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/match-description:', err);
      res.status(500).json({
        error: 'AI analysis service encountered a temporary error. Please review details manually.',
      });
    }
  }
);

// AI Duplicate Detection Between Two Reports
aiRouter.post(
  '/detect-duplicates',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reportIdA, reportIdB } = req.body;

      if (!reportIdA || !reportIdB) {
        res.status(400).json({ error: 'reportIdA and reportIdB are required.' });
        return;
      }

      const reportA = db.getReportById(reportIdA);
      const reportB = db.getReportById(reportIdB);

      if (!reportA || !reportB) {
        res.status(404).json({ error: 'One or both reports could not be found.' });
        return;
      }

      const user = req.user!;
      const result = await detectDuplicateReports(reportA, reportB);

      db.addAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'AI_DUPLICATE_CHECK_EXECUTED',
        resourceType: 'REPORT',
        resourceId: `${reportIdA}_vs_${reportIdB}`,
        details: `Evaluated potential duplication between ${reportIdA} and ${reportIdB}. Potential duplicate: ${result.isPotentialDuplicate}.`,
        result: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/detect-duplicates:', err);
      res.status(500).json({
        error: 'AI duplicate detection service encountered an issue.',
      });
    }
  }
);

// AI Factual Case Situation Report Summary
aiRouter.post(
  '/case-summary',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { caseId } = req.body;

      if (!caseId) {
        res.status(400).json({ error: 'caseId is required.' });
        return;
      }

      const targetCase = db.getCaseById(caseId);
      if (!targetCase) {
        res.status(404).json({ error: `Case ${caseId} not found.` });
        return;
      }

      const reports = db.getAllReports(caseId);
      const user = req.user!;

      const result = await generateCaseSummary(targetCase, reports);

      // Save summary on case
      db.updateCase(caseId, { summary: result.summary });

      db.addAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'AI_SUMMARY_GENERATED',
        resourceType: 'CASE',
        resourceId: caseId,
        details: `Generated situation report summary for case ${caseId}.`,
        result: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/case-summary:', err);
      res.status(500).json({
        error: 'Failed to generate AI case summary.',
      });
    }
  }
);

// AI Maps Grounding Location Intelligence (gemini-3.5-flash with googleMaps tool)
aiRouter.post(
  '/location-intelligence',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { caseId, locationName, latitude, longitude } = req.body;

      if (!caseId || !locationName) {
        res.status(400).json({ error: 'caseId and locationName are required.' });
        return;
      }

      const targetCase = db.getCaseById(caseId);
      if (!targetCase) {
        res.status(404).json({ error: `Case ${caseId} not found.` });
        return;
      }

      const lat = latitude !== undefined ? parseFloat(latitude) : targetCase.person.lastKnownCoordinates?.lat || 10.9892;
      const lng = longitude !== undefined ? parseFloat(longitude) : targetCase.person.lastKnownCoordinates?.lng || 76.9614;

      const user = req.user!;
      const result = await analyzeLocationIntelligence(
        targetCase.title,
        targetCase.person.fullName,
        locationName,
        { lat, lng }
      );

      db.addAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'AI_MAPS_LOCATION_INTELLIGENCE_EXECUTED',
        resourceType: 'CASE',
        resourceId: caseId,
        details: `Ran Google Maps Grounding analysis for sector "${locationName}" on case ${caseId}.`,
        result: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/location-intelligence:', err);
      res.status(500).json({
        error: 'Failed to generate Google Maps grounded location intelligence.',
      });
    }
  }
);

