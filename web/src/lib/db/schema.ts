import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  decimal,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: text('github_id').unique().notNull(),
  githubUsername: text('github_username').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('dev').notNull(),
  donuts: integer('donuts').default(0).notNull(),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  streakDays: integer('streak_days').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(userApiKeys),
  projects: many(projects),
  workstreams: many(workstreams),
}))

export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  anthropicKeyEncrypted: text('anthropic_key_encrypted').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
}))

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  type: text('type').default('single-repo').notNull(),
  baseBranch: text('base_branch').default('main').notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  repos: many(projectRepos),
  workstreams: many(workstreams),
}))

export const projectRepos = pgTable('project_repos', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  githubRepoUrl: text('github_repo_url').notNull(),
  githubRepoName: text('github_repo_name').notNull(),
  path: text('path'),
  defaultBranch: text('default_branch').default('main').notNull(),
})

export const projectReposRelations = relations(projectRepos, ({ one }) => ({
  project: one(projects, {
    fields: [projectRepos.projectId],
    references: [projects.id],
  }),
}))

export const workstreams = pgTable('workstreams', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  status: text('status').default('pending').notNull(),
  currentIteration: integer('current_iteration').default(0).notNull(),
  maxIterations: integer('max_iterations').default(20).notNull(),
  fargateTaskArn: text('fargate_task_arn'),
  fargateCluster: text('fargate_cluster'),
  cloudwatchLogGroup: text('cloudwatch_log_group'),
  cloudwatchLogStream: text('cloudwatch_log_stream'),
  promptBlobUrl: text('prompt_blob_url'),
  progressBlobUrl: text('progress_blob_url'),
  tokensIn: bigint('tokens_in', { mode: 'number' }).default(0).notNull(),
  tokensOut: bigint('tokens_out', { mode: 'number' }).default(0).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 4 }).default('0').notNull(),
  pendingQuestion: text('pending_question'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const workstreamsRelations = relations(workstreams, ({ one }) => ({
  project: one(projects, {
    fields: [workstreams.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [workstreams.userId],
    references: [users.id],
  }),
}))

export const roleLimits = pgTable('role_limits', {
  role: text('role').primaryKey(),
  characterName: text('character_name').notNull(),
  maxIterationsPerWorkstream: integer('max_iterations_per_workstream').notNull(),
  maxConcurrentWorkstreams: integer('max_concurrent_workstreams').notNull(),
  maxWorkstreamsPerDay: integer('max_workstreams_per_day').notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserApiKey = typeof userApiKeys.$inferSelect
export type NewUserApiKey = typeof userApiKeys.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectRepo = typeof projectRepos.$inferSelect
export type NewProjectRepo = typeof projectRepos.$inferInsert
export type Workstream = typeof workstreams.$inferSelect
export type NewWorkstream = typeof workstreams.$inferInsert
export type RoleLimit = typeof roleLimits.$inferSelect
export type NewRoleLimit = typeof roleLimits.$inferInsert
