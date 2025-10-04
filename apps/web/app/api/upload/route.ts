import { NextRequest, NextResponse } from 'next/server';

// DEVELOPMENT ONLY - Mock API for testing
// DO NOT ENABLE IN PRODUCTION
// This is a placeholder for development testing

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation - check if it's a valid note structure
    if (!body.title || !body.markdown || !body.author) {
      return NextResponse.json(
        { error: 'Invalid note structure' },
        { status: 400 }
      );
    }
    
    // Mock CID generation
    const mockCid = `bafy-${Date.now()}-mock-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json({
      cid: mockCid,
      success: true,
      message: 'Note uploaded successfully (MOCK)'
    });
    
  } catch (error) {
    console.error('Mock upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable in production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
