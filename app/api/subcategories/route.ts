import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateString, validateInteger, validateBoolean } from '@/lib/validation';
import type { Subcategory } from '@/lib/types';

/**
 * GET /api/subcategories
 * List all subcategories (optionally filtered by category_id)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const categoryIdParam = searchParams.get('category_id');

    const db = getDb();

    let query = 'SELECT * FROM subcategories';
    const params: any[] = [];

    // Optional filter by category_id
    if (categoryIdParam) {
      const categoryId = validateInteger(categoryIdParam, 'category_id', 1);
      query += ' WHERE category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY order_index';

    const subcategories = db.prepare(query).all(...params) as Subcategory[];

    return NextResponse.json({
      success: true,
      data: subcategories,
    });
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

    console.error('Subcategories GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subcategories
 * Create a new subcategory
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const body = await request.json();

    // Validate required fields
    const categoryId = validateInteger(body.category_id, 'category_id', 1);
    const name = validateString(body.name, 'name', 1, 100);

    const db = getDb();

    // Verify category exists
    const category = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(categoryId) as { id: number } | undefined;

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }

    // Calculate order_index if not provided
    let orderIndex: number;
    if (body.order_index !== undefined && body.order_index !== null) {
      orderIndex = validateInteger(body.order_index, 'order_index', 0);
    } else {
      // Auto-calculate: get max order_index + 1 for this category
      const maxOrder = db
        .prepare('SELECT MAX(order_index) as max FROM subcategories WHERE category_id = ?')
        .get(categoryId) as { max: number | null };
      orderIndex = (maxOrder?.max ?? -1) + 1;
    }

    // Validate boolean fields with defaults
    const showSeparator = body.show_separator !== undefined
      ? validateBoolean(body.show_separator)
      : true;

    const adminOnly = body.admin_only !== undefined
      ? validateBoolean(body.admin_only)
      : false;

    // Insert subcategory
    const result = db
      .prepare(`
        INSERT INTO subcategories (category_id, name, order_index, show_separator, admin_only)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(categoryId, name, orderIndex, showSeparator ? 1 : 0, adminOnly ? 1 : 0);

    // Fetch the created subcategory
    const subcategory = db
      .prepare('SELECT * FROM subcategories WHERE id = ?')
      .get(result.lastInsertRowid) as Subcategory;

    return NextResponse.json(
      {
        success: true,
        data: subcategory,
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

    console.error('Subcategories POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
