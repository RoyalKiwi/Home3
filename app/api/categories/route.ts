import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateString, validateInteger } from '@/lib/validation';
import type { Category } from '@/lib/types';

/**
 * GET /api/categories
 * List all categories ordered by order_index
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const db = getDb();
    const categories = db
      .prepare('SELECT * FROM categories ORDER BY order_index')
      .all() as Category[];

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.error('Categories GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const body = await request.json();

    // Validate required fields
    const name = validateString(body.name, 'name', 1, 100);

    const db = getDb();

    // Calculate order_index if not provided
    let orderIndex: number;
    if (body.order_index !== undefined && body.order_index !== null) {
      orderIndex = validateInteger(body.order_index, 'order_index', 0);
    } else {
      // Auto-calculate: get max order_index + 1
      const maxOrder = db
        .prepare('SELECT MAX(order_index) as max FROM categories')
        .get() as { max: number | null };
      orderIndex = (maxOrder?.max ?? -1) + 1;
    }

    // Insert category
    const result = db
      .prepare(
        'INSERT INTO categories (name, order_index) VALUES (?, ?)'
      )
      .run(name, orderIndex);

    // Fetch the created category
    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(result.lastInsertRowid) as Category;

    return NextResponse.json(
      {
        success: true,
        data: category,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error.message && error.message.includes('must be')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Categories POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
