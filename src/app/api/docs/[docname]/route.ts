import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const DOCS_DIR = join(process.cwd(), 'docs');

const DOC_MAPPING: Record<string, string> = {
  'kimi-claude-integration': 'kimi-claude-integration.md',
  'security-governance': 'security-governance.md',
  'security-audit': 'SECURITY-AUDIT.md',
  'security-testing': 'SECURITY-TESTING-RESULTS.md',
  'secrets-manager': 'secrets-manager-examples.md',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docname: string }> }
) {
  try {
    const resolvedParams = await params;
    const docName = resolvedParams.docname;
    const fileName = DOC_MAPPING[docName];

    if (!fileName) {
      return NextResponse.json(
        { error: 'Documentation not found' },
        { status: 404 }
      );
    }

    const filePath = join(DOCS_DIR, fileName);
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error reading documentation:', error);
    return NextResponse.json(
      { error: 'Failed to read documentation' },
      { status: 500 }
    );
  }
}
