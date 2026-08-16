import { BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface ZephyrStepInput {
  action: string;
  expectedResult: string;
  testData: string;
}

export interface ParsedZephyrTestCase {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  folderPath?: string;
  steps: ZephyrStepInput[];
}

export interface ParsedZephyrProjectExport {
  folderPaths: string[];
  testCases: ParsedZephyrTestCase[];
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function decodeHtmlEntities(text: string): string {
  const namedEntities: Record<string, string> = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    '#39': "'",
  };

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const normalizedEntity = entity.toLowerCase();
    if (normalizedEntity.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    if (normalizedEntity.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    return namedEntities[normalizedEntity] ?? match;
  });
}

function stripHtmlMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|tr|table|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '');
}

function readText(value: unknown): string {
  const rawValue =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : '';

  if (!rawValue) return '';

  return decodeHtmlEntities(stripHtmlMarkup(rawValue))
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function parseZephyrXml(xmlContent: string): ParsedZephyrProjectExport {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: false,
    parseTagValue: false,
  });

  const parsed = parser.parse(xmlContent) as {
    project?: {
      folders?: { folder?: Array<{ fullPath?: string } | { fullPath?: string }> | { fullPath?: string } };
      testCases?: {
        testCase?:
          | Array<{
              name?: string;
              objective?: string;
              priority?: string;
              status?: string;
              folder?: string;
              testScript?: {
                steps?: {
                  step?:
                    | Array<{ description?: string; expectedResult?: string; testData?: string }>
                    | { description?: string; expectedResult?: string; testData?: string };
                };
              };
            }>
          | {
              name?: string;
              objective?: string;
              priority?: string;
              status?: string;
              folder?: string;
              testScript?: {
                steps?: {
                  step?:
                    | Array<{ description?: string; expectedResult?: string; testData?: string }>
                    | { description?: string; expectedResult?: string; testData?: string };
                };
              };
            };
      };
    };
  };

  if (!parsed.project) {
    throw new BadRequestException('Invalid Zephyr XML file: missing project root');
  }

  const folderPaths = asArray(parsed.project.folders?.folder)
    .map((folder) => readText(folder.fullPath))
    .filter(Boolean);

  const testCases = asArray(parsed.project.testCases?.testCase).map((testCase) => {
    const steps = asArray(testCase.testScript?.steps?.step)
      .map((step) => ({
        action: readText(step.description),
        expectedResult: readText(step.expectedResult),
        testData: readText(step.testData),
      }))
      .filter((step) => step.action || step.expectedResult || step.testData);

    return {
      title: readText(testCase.name),
      description: readText(testCase.objective) || undefined,
      priority: readText(testCase.priority) || undefined,
      status: readText(testCase.status) || undefined,
      folderPath: readText(testCase.folder) || undefined,
      steps,
    };
  });

  if (testCases.length === 0) {
    throw new BadRequestException('The Zephyr XML file does not contain any test cases');
  }

  return { folderPaths, testCases };
}