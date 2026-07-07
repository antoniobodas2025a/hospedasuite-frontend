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
    R2_ENDPOINT_VALUE: process.env.R2_ENDPOINT || 'NOT SET',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? `${process.env.R2_ACCESS_KEY_ID.slice(0, 8)}...` : '❌ MISSING',
    R2_ACCESS_KEY_ID_LENGTH: process.env.R2_ACCESS_KEY_ID?.length || 0,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '✅ SET (hidden)' : '❌ MISSING',
    R2_SECRET_ACCESS_KEY_LENGTH: process.env.R2_SECRET_ACCESS_KEY?.length || 0,
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
      urlPreview: presignedUrl.slice(0, 150) + '...',
      hasSignature: presignedUrl.includes('X-Amz-Signature='),
      hasSignedHeaders: presignedUrl.includes('X-Amz-SignedHeaders='),
      signedHeaders: presignedUrl.match(/X-Amz-SignedHeaders=([^&]+)/)?.[1],
      fullUrl: presignedUrl,
    };

    // 3. Try to PUT a tiny test file
    const testBody = Buffer.from('diagnostic-test');
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      body: testBody,
      headers: {
        'Content-Length': testBody.length.toString(),
      },
    });

    results.putTest = {
      status: res.ok ? '✅ Success' : `❌ Failed (${res.status})`,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
    };

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Could not read');
      results.putTest.errorBody = errorBody.slice(0, 1000);
      
      // Parse XML error from R2 if present
      const errorCode = errorBody.match(/<Code>([^<]+)<\/Code>/)?.[1];
      const errorMessage = errorBody.match(/<Message>([^<]+)<\/Message>/)?.[1];
      if (errorCode || errorMessage) {
        results.putTest.parsedError = {
          code: errorCode,
          message: errorMessage,
        };
      }
    }
  } catch (error: any) {
    results.presignedUrl = { 
      status: '❌ Error', 
      message: error.message,
      stack: error.stack?.slice(0, 500),
    };
  }

  // 4. Test connectivity to R2 endpoint
  try {
    const endpoint = process.env.R2_ENDPOINT;
    if (endpoint) {
      const pingRes = await fetch(endpoint, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      results.connectivity = {
        status: '✅ Reachable',
        statusCode: pingRes.status,
      };
    } else {
      results.connectivity = { status: '❌ No endpoint configured' };
    }
  } catch (error: any) {
    results.connectivity = {
      status: '❌ Unreachable',
      error: error.message,
    };
  }

  return NextResponse.json(results, { status: 200 });
}
