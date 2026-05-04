/**
 * domain.ts — Branded types for all domain entities.
 * Prevents accidentally mixing IDs from different tables.
 */

type Brand<T, B> = T & { readonly __brand: B };

// ─── Identifier types ───────────────────────────────────────────────────────
export type RitualId         = Brand<string, 'RitualId'>;
export type GoalId           = Brand<string, 'GoalId'>;
export type StageId          = Brand<string, 'StageId'>;
export type GoalTaskId       = Brand<string, 'GoalTaskId'>;
export type VowId            = Brand<string, 'VowId'>;
export type TransactionId    = Brand<string, 'TransactionId'>;
export type TaskId           = Brand<string, 'TaskId'>;
export type TimerSessionId   = Brand<string, 'TimerSessionId'>;
export type NutritionEntryId = Brand<string, 'NutritionEntryId'>;
export type DiaryEntryId     = Brand<string, 'DiaryEntryId'>;
export type CategoryId       = Brand<string, 'CategoryId'>;

// ─── Value types ─────────────────────────────────────────────────────────────
export type ISODateString = Brand<string, 'ISODateString'>;
export type HexColor      = Brand<string, 'HexColor'>;
export type IconName      = Brand<string, 'IconName'>;
export type AuraPoints    = Brand<number, 'AuraPoints'>;

// ─── Cast helpers (use sparingly — prefer passing typed values) ──────────────
export const asISODate    = (s: string): ISODateString => s as ISODateString;
export const asRitualId   = (s: string): RitualId      => s as RitualId;
export const asGoalId     = (s: string): GoalId        => s as GoalId;
export const asTaskId     = (s: string): TaskId        => s as TaskId;
export const asHexColor   = (s: string): HexColor      => s as HexColor;
export const asIconName   = (s: string): IconName      => s as IconName;
