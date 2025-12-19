#!/usr/bin/env bun

/**
 * PAI Status Checker
 *
 * Checks if PAI knowledge extraction has run in the current project
 * and shows detailed status information.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ProjectStatus {
  hasSkills: boolean;
  skillsPath: string;
  skillCount: number;
  skills: string[];
  lastGenerated?: Date;
  projectType?: string;
}

function checkProjectStatus(projectRoot: string): ProjectStatus {
  const skillsPath = join(projectRoot, '.claude', 'skills', 'project-codebase');
  const hasSkills = existsSync(skillsPath);

  const status: ProjectStatus = {
    hasSkills,
    skillsPath,
    skillCount: 0,
    skills: [],
  };

  if (hasSkills) {
    const files = readdirSync(skillsPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    status.skillCount = mdFiles.length;
    status.skills = mdFiles;

    // Get last modified time
    const stats = statSync(skillsPath);
    status.lastGenerated = stats.mtime;

    // Try to detect project type from tech-stack.md
    const techStackPath = join(skillsPath, 'tech-stack.md');
    if (existsSync(techStackPath)) {
      const content = require('fs').readFileSync(techStackPath, 'utf-8');
      const match = content.match(/Language.*?:\s*(\w+)/);
      if (match) status.projectType = match[1];
    }
  }

  return status;
}

function displayStatus(status: ProjectStatus, projectRoot: string) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🔍 PAI PROJECT STATUS                                    ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  📁 Project: ${projectRoot.slice(-40).padEnd(40)} ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');

  if (status.hasSkills) {
    console.log('║  ✅ Status: Skills Generated                              ║');
    console.log(`║  📊 Skill Files: ${status.skillCount.toString().padEnd(44)} ║`);
    if (status.projectType) {
      console.log(`║  📦 Project Type: ${status.projectType.padEnd(42)} ║`);
    }
    if (status.lastGenerated) {
      const timeAgo = getTimeAgo(status.lastGenerated);
      console.log(`║  🕐 Generated: ${timeAgo.padEnd(45)} ║`);
    }
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  📄 Generated Skills:                                     ║');
    status.skills.forEach(skill => {
      console.log(`║    • ${skill.padEnd(53)} ║`);
    });
  } else {
    console.log('║  ❌ Status: No Skills Generated                           ║');
    console.log('║                                                           ║');
    console.log('║  🔧 Expected behavior:                                    ║');
    console.log('║    - Hook should run automatically on SessionStart       ║');
    console.log('║    - Check system-reminders for hook output              ║');
    console.log('║    - Skills will be generated in:                        ║');
    console.log(`║      ${status.skillsPath.slice(-55).padEnd(55)} ║`);
  }

  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Main execution
async function main() {
  const projectRoot = process.cwd();
  const status = checkProjectStatus(projectRoot);
  displayStatus(status, projectRoot);

  // Exit with status code
  process.exit(status.hasSkills ? 0 : 1);
}

main();
