#!/usr/bin/env bun
/**
 * Pack Icon Generator
 *
 * Generates 256x256 PNG icons for all PAI packs using Canvas API.
 * Each icon features a unique color scheme and emoji/symbol based on pack name.
 */

import { readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createCanvas } from 'canvas';

const SKILLS_DIR = join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
const ICON_SIZE = 256;

/**
 * Pack metadata for icon generation
 */
interface PackIcon {
  emoji: string;
  primaryColor: string;
  secondaryColor: string;
  category?: string;
}

/**
 * Icon configurations for each pack
 */
const PACK_ICONS: Record<string, PackIcon> = {
  'agent-observability': { emoji: '📊', primaryColor: '#4F46E5', secondaryColor: '#818CF8' },
  'alex-hormozi-pitch': { emoji: '💰', primaryColor: '#059669', secondaryColor: '#34D399' },
  'apex-ui': { emoji: '🎨', primaryColor: '#DC2626', secondaryColor: '#F87171' },
  'apex-ui-ux': { emoji: '✨', primaryColor: '#7C3AED', secondaryColor: '#A78BFA' },
  'async-orchestration': { emoji: '🔄', primaryColor: '#2563EB', secondaryColor: '#60A5FA' },
  'auto': { emoji: '🤖', primaryColor: '#0891B2', secondaryColor: '#22D3EE' },
  'boss-ui-ux': { emoji: '👔', primaryColor: '#DC2626', secondaryColor: '#FCA5A5' },
  'claude-agent-sdk': { emoji: '🧩', primaryColor: '#8B5CF6', secondaryColor: '#C4B5FD' },
  'content-scanner': { emoji: '🔍', primaryColor: '#0D9488', secondaryColor: '#5EEAD4' },
  'CORE': { emoji: '⚡', primaryColor: '#EAB308', secondaryColor: '#FDE047' },
  'create-skill': { emoji: '🏗️', primaryColor: '#059669', secondaryColor: '#6EE7B7' },
  'docx': { emoji: '📄', primaryColor: '#2563EB', secondaryColor: '#93C5FD' },
  'example-skill': { emoji: '📝', primaryColor: '#6B7280', secondaryColor: '#D1D5DB' },
  'fabric': { emoji: '🧵', primaryColor: '#DB2777', secondaryColor: '#F9A8D4' },
  'ffuf': { emoji: '🔐', primaryColor: '#DC2626', secondaryColor: '#FCA5A5' },
  'input-leap-manager': { emoji: '⌨️', primaryColor: '#7C3AED', secondaryColor: '#C4B5FD' },
  'kai': { emoji: '🌟', primaryColor: '#F59E0B', secondaryColor: '#FCD34D' },
  'mcp-builder': { emoji: '🔨', primaryColor: '#0891B2', secondaryColor: '#67E8F9' },
  'mcp-troubleshooter': { emoji: '🔧', primaryColor: '#DC2626', secondaryColor: '#FCA5A5' },
  'meta-prompting': { emoji: '🎯', primaryColor: '#8B5CF6', secondaryColor: '#DDD6FE' },
  'mt5-trading': { emoji: '📈', primaryColor: '#059669', secondaryColor: '#6EE7B7' },
  'pai-diagnostics': { emoji: '🩺', primaryColor: '#DC2626', secondaryColor: '#FCA5A5' },
  'pdf': { emoji: '📕', primaryColor: '#DC2626', secondaryColor: '#FCA5A5' },
  'pptx': { emoji: '📊', primaryColor: '#EA580C', secondaryColor: '#FDBA74' },
  'proactive-scanner': { emoji: '👁️', primaryColor: '#0891B2', secondaryColor: '#67E8F9' },
  'project-codebase': { emoji: '📦', primaryColor: '#7C3AED', secondaryColor: '#DDD6FE' },
  'prompt-enhancement': { emoji: '✍️', primaryColor: '#DB2777', secondaryColor: '#F9A8D4' },
  'prompting': { emoji: '💬', primaryColor: '#2563EB', secondaryColor: '#93C5FD' },
  'python-agent-patterns': { emoji: '🐍', primaryColor: '#3B82F6', secondaryColor: '#93C5FD' },
  'ref-tools': { emoji: '🔗', primaryColor: '#6B7280', secondaryColor: '#D1D5DB' },
  'research': { emoji: '🔬', primaryColor: '#0891B2', secondaryColor: '#67E8F9' },
  'session-persistence': { emoji: '💾', primaryColor: '#7C3AED', secondaryColor: '#C4B5FD' },
  'skill-creator-anthropic': { emoji: '🎨', primaryColor: '#DB2777', secondaryColor: '#F9A8D4' },
  'typescript-architectural-fixer': { emoji: '🏗️', primaryColor: '#3178C6', secondaryColor: '#93C5FD' },
  'typescript-error-fixer': { emoji: '🔧', primaryColor: '#3178C6', secondaryColor: '#93C5FD' },
  'upgrade': { emoji: '⬆️', primaryColor: '#059669', secondaryColor: '#6EE7B7' },
  'validation': { emoji: '✅', primaryColor: '#059669', secondaryColor: '#6EE7B7' },
  'veritas': { emoji: '⚖️', primaryColor: '#0891B2', secondaryColor: '#67E8F9' },
  'webapp-testing': { emoji: '🧪', primaryColor: '#8B5CF6', secondaryColor: '#DDD6FE' },
  'xlsx': { emoji: '📊', primaryColor: '#059669', secondaryColor: '#6EE7B7' },
};

/**
 * Generate icon for a pack
 */
function generateIcon(packName: string, config: PackIcon): Buffer {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, ICON_SIZE, ICON_SIZE);
  gradient.addColorStop(0, config.primaryColor);
  gradient.addColorStop(1, config.secondaryColor);

  // Draw rounded rectangle background
  const radius = 40;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(ICON_SIZE - radius, 0);
  ctx.quadraticCurveTo(ICON_SIZE, 0, ICON_SIZE, radius);
  ctx.lineTo(ICON_SIZE, ICON_SIZE - radius);
  ctx.quadraticCurveTo(ICON_SIZE, ICON_SIZE, ICON_SIZE - radius, ICON_SIZE);
  ctx.lineTo(radius, ICON_SIZE);
  ctx.quadraticCurveTo(0, ICON_SIZE, 0, ICON_SIZE - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Add subtle shine effect
  const shineGradient = ctx.createLinearGradient(0, 0, 0, ICON_SIZE / 2);
  shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shineGradient;
  ctx.fill();

  // Draw emoji
  ctx.font = 'bold 120px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';

  // Add text shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.fillText(config.emoji, ICON_SIZE / 2, ICON_SIZE / 2);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Add border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

/**
 * Get default icon config for unknown packs
 */
function getDefaultIconConfig(packName: string): PackIcon {
  // Generate a consistent color based on pack name hash
  let hash = 0;
  for (let i = 0; i < packName.length; i++) {
    hash = packName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const primaryColor = `hsl(${hue}, 65%, 50%)`;
  const secondaryColor = `hsl(${hue}, 65%, 70%)`;

  return {
    emoji: '📦',
    primaryColor,
    secondaryColor,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🎨 PAI Pack Icon Generator\n');

  // Get all pack directories
  const entries = readdirSync(SKILLS_DIR);
  const packs = entries.filter(entry => {
    const fullPath = join(SKILLS_DIR, entry);
    return statSync(fullPath).isDirectory();
  });

  console.log(`Found ${packs.length} packs\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const pack of packs) {
    const packDir = join(SKILLS_DIR, pack);
    const iconPath = join(packDir, 'icon.png');

    // Skip if icon already exists
    if (existsSync(iconPath)) {
      console.log(`⏭️  ${pack} - icon exists, skipping`);
      skipped++;
      continue;
    }

    try {
      // Get or create icon config
      const config = PACK_ICONS[pack] || getDefaultIconConfig(pack);

      // Generate icon
      const iconBuffer = generateIcon(pack, config);

      // Save icon
      writeFileSync(iconPath, iconBuffer);

      console.log(`✅ ${pack} - generated (${config.emoji})`);
      generated++;
    } catch (error) {
      console.error(`❌ ${pack} - failed:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${packs.length}`);
}

main().catch(console.error);
