#!/usr/bin/env node
/**
 * Course Image Analyzer
 * 
 * 分析 content.md 内容，识别适合用图表呈现的部分，
 * 并在 assets/ 资料夹生成图片建议文件。
 * 
 * Usage:
 *   node analyze-images.mjs <course-dir>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 适合图像化的内容模式
const IMAGE_PATTERNS = [
  { pattern: /責任|归属|责任/, type: 'flowchart', title: '责任归属流程图', desc: '展示过失责任判断流程' },
  { pattern: /求償|赔偿|损害/, type: 'diagram', title: '损害赔偿项目图', desc: '列出可请求的赔偿项目' },
  { pattern: /流程|步骤|步骤/, type: 'flowchart', title: '处理流程图', desc: '事故发生后的处理步骤' },
  { pattern: /诉讼|法院|法官/, type: 'timeline', title: '诉讼时间线', desc: '从事故到判决的时程' },
  { pattern: /保险|强制险|任意险/, type: 'comparison', title: '保险对比表', desc: '强制险与任意险的差异' },
  { pattern: /計算|公式|算式/, type: 'diagram', title: '计算公式图', desc: '赔偿金额计算方式' },
  { pattern: /證據|保全|蒐集/, type: 'checklist', title: '证据清单图', desc: '需要保全的证据列表' },
];

function analyzeContent(md) {
  const suggestions = [];
  const lines = md.split('\n');
  let currentSection = '';
  let sectionContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 侦测章节标题
    if (/^#{1,2}\s/.test(line)) {
      currentSection = line.replace(/^#+\s/, '').trim();
      sectionContent = '';
    }
    
    // 收集章节内容（用于分析）
    if (currentSection && line.trim()) {
      sectionContent += line + ' ';
    }
    
    // 侦测适合图像化的模式
    for (const p of IMAGE_PATTERNS) {
      if (p.pattern.test(line)) {
        // 检查是否已存在类似建议
        const exists = suggestions.find(s => 
          s.section === currentSection || 
          s.title.includes(p.title.replace(/图$/, ''))
        );
        if (!exists && currentSection) {
          suggestions.push({
            type: p.type,
            title: p.title,
            description: p.desc,
            section: currentSection,
            line: i + 1,
            suggestion: `建议在此处插入 ${p.title}`
          });
        }
      }
    }
  }
  
  return suggestions;
}

function generateImagePrompt(suggestion) {
  const prompts = {
    flowchart: `创建一个简洁的流程图，使用浅蓝色背景和深蓝色箭头。标题：${suggestion.title}`,
    diagram: `创建一个信息图表，使用卡片式设计展示各个项目。标题：${suggestion.title}`,
    timeline: `创建一个水平时间线，使用圆圈标记各时间点。标题：${suggestion.title}`,
    comparison: `创建一个对比表格，左边强制险，右边任意险。标题：${suggestion.title}`,
    checklist: `创建一个勾选清单，使用绿色勾选符号。标题：${suggestion.title}`
  };
  
  return prompts[suggestion.type] || prompts.diagram;
}

function buildReport(courseDir, suggestions) {
  let report = `# ${courseDir.split('/').pop()} 圖片建議報告\n\n`;
  report += `分析了 ${suggestions.length} 個適合圖像化的位置：\n\n`;
  
  if (suggestions.length === 0) {
    report += '✅ 未發現特別適合圖像化的內容\n';
  } else {
    report += '| 位置 | 類型 | 標題 | 說明 |\n';
    report += '|------|------|------|------|\n';
    
    for (const s of suggestions) {
      report += `| ${s.section.substring(0, 20)} | ${s.type} | ${s.title} | ${s.description} |\n`;
    }
    
    report += '\n## 圖片生成 Prompt 建議\n\n';
    for (const s of suggestions) {
      report += `### ${s.title}\n`;
      report += '```\n' + generateImagePrompt(s) + '\n```\n\n';
    }
  }
  
  return report;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node analyze-images.mjs <course-dir>');
    console.log('Example: node analyze-images.mjs 車禍求償');
    process.exit(1);
  }
  
  const courseDir = resolve(args[0]);
  const contentPath = join(courseDir, 'content.md');
  const assetsDir = join(courseDir, 'assets');
  
  if (!existsSync(contentPath)) {
    console.error(`❌ Content file not found: ${contentPath}`);
    process.exit(1);
  }
  
  // 确保 assets 目录存在
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }
  
  const content = readFileSync(contentPath, 'utf-8');
  const suggestions = analyzeContent(content);
  
  console.log(`\n🔍 分析中: ${courseDir}`);
  console.log(`   找到 ${suggestions.length} 个适合图像化的位置\n`);
  
  if (suggestions.length > 0) {
    for (const s of suggestions) {
      console.log(`   📍 ${s.section}`);
      console.log(`      → ${s.title} (${s.type})`);
    }
  }
  
  // 写入建议文件
  const reportPath = join(assetsDir, 'image-suggestions.md');
  const report = buildReport(courseDir, suggestions);
  writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`\n✅ 已生成图片建议: ${reportPath}`);
  console.log('   可以使用这些提示语生成对应的图片');
}

main();
