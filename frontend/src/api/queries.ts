import { useQuery } from "@tanstack/react-query";
import { sutraApi } from "./client";
import {
  normalizeBridges,
  normalizeCases,
  normalizeGraph,
  normalizeHealth,
  normalizeRelatedCases,
  normalizeTimeline,
} from "./normalizers";

export const sutraQueryKeys = {
  health: ["system", "health"] as const,
  cases: ["cases"] as const,
  case: (caseId: string) => ["cases", caseId] as const,
  neighborhood: (caseId?: string, seedId?: string, depth = 1) => ["graph", "neighborhood", caseId, seedId, depth] as const,
  bridges: (caseId?: string) => ["analytics", "bridges", caseId] as const,
  relatedCases: (caseId?: string) => ["cross-case", caseId] as const,
  timeline: (caseId?: string) => ["analytics", "timeline", caseId] as const,
};

export function useSystemHealth() {
  return useQuery({
    queryKey: sutraQueryKeys.health,
    queryFn: async () => normalizeHealth(await sutraApi.getHealth()),
    retry: 1,
    refetchInterval: 30_000,
  });
}

export function useCases(token?: string) {
  return useQuery({
    queryKey: sutraQueryKeys.cases,
    queryFn: async () => normalizeCases(await sutraApi.listCases(token!)),
    enabled: Boolean(token),
  });
}

export function useCaseDetail(token?: string, caseId?: string) {
  return useQuery({
    queryKey: caseId ? sutraQueryKeys.case(caseId) : ["cases", "empty"],
    queryFn: () => sutraApi.getCase(token!, caseId!),
    enabled: Boolean(token && caseId),
  });
}

export function useNeighborhood(
  token?: string,
  params?: { caseId?: string; seedId?: string; depth?: number },
  enabled = false,
) {
  const { caseId, seedId, depth = 1 } = params ?? {};
  return useQuery({
    queryKey: sutraQueryKeys.neighborhood(caseId, seedId, depth),
    queryFn: async () => normalizeGraph(await sutraApi.getNeighborhood(token!, { caseId, seedId, depth })),
    enabled: Boolean(token && enabled),
    retry: 1,
  });
}

export function useBridges(token?: string, caseId?: string, enabled = Boolean(caseId)) {
  return useQuery({
    queryKey: sutraQueryKeys.bridges(caseId),
    queryFn: async () => normalizeBridges(await sutraApi.getBridges(token!, caseId)),
    enabled: Boolean(token && enabled),
    retry: 1,
  });
}

export function useRelatedCases(token?: string, caseId?: string) {
  return useQuery({
    queryKey: sutraQueryKeys.relatedCases(caseId),
    queryFn: async () => normalizeRelatedCases(await sutraApi.getRelatedCases(token!, caseId)),
    enabled: Boolean(token && caseId),
    retry: 1,
  });
}

export function useTimeline(token?: string, caseId?: string) {
  return useQuery({
    queryKey: sutraQueryKeys.timeline(caseId),
    queryFn: async () => normalizeTimeline(await sutraApi.getTimeline(token!, caseId)),
    enabled: Boolean(token && caseId),
    retry: 1,
  });
}
