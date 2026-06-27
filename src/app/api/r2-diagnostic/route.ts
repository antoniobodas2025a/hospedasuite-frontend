/**
 * 🔍 R2 Diagnostic Endpoint
 * 
 * Tests R2 connectivity from the server side to isolate the issue.
 * Access: GET /api/r2-diagnostic
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // 1. Check environment variables
  results.env = {
    R2_ENDPOINT: process.env.R2_ENDPOINT ? '✅ SET' : '❌ MISSING',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? `${process.env.R2_ACCESS_KEY_ID.slice(0, 8)}...` : '❌ MISSING',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '✅ SET (hidden)' : '❌ MISSING',
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || '❌ MISSING',
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || '❌ MISSING',
  };

  // 2. Try to generate a presigned URL
  try {
    const { getPresignedUploadUrl, R2_BUCKET } = await import('@/lib/r2-client');
    const testKey = `diagnostic/${Date.now()}/test.jpg`;
    const presignedUrl = await getPresignedUploadUrl(testKey, 'image/jpeg');
    results.presignedUrl = {
      status: '✅ Generated',
      bucket: R2_BUCKET,
      key: testKey,
      urlPreview: presignedUrl.slice(0, 100) + '...',
      hasSignature: presignedUrl.includes('X-Amz-Signature='),
      hasSignedHeaders: presignedUrl.includes('X-Amz-SignedHeaders='),
      signedHeaders: presignedUrl.match(/X-Amz-SignedHeaders=([^&]+)/)?.[1],
    };

    // 3. Try to PUT a tiny test file
    const testBody = Buffer.from('test');
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      body: testBody,
    });

    results.putTest = {
      status: res.ok ? '✅ Success' : `❌ Failed (${res.status})`,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
    };

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Could not read');
      results.putTest.errorBody = errorBody.slice(0, 500);
    }
  } catch (error: any) {
    results.presignedUrl = { status: '❌ Error', message: error.message };
  }

  return NextResponse.json(results, { status: 200 });
}
