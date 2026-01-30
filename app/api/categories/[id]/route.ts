import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateString, validateInteger } from '@/lib/validation';
import type { Category, Subcategory } from '@/lib/types';

/**
 * GET /api/categories/[id]
 * Get a single category with its subcategories
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    const { id } = await params;
    const categoryId = validateInteger(id, 'id', 1);

    const db = getDb();

    // Get category
    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(categoryId) as Category | undefined;

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get subcategories
    const subcategories = db
      .prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY order_index')
      .all(categoryId) as Subcategory[];

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        subcategories,
      },
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

    console.error('Category GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories/[id]
 * Update a category
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    const { id } = await params;
    const categoryId = validateInteger(id, 'id', 1);
    const body = await request.json();

    // Validate at least one field is provided
    if (!body.name && body.order_index === undefined && body.order_index === null) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if category exists
    const existing = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(categoryId) as { id: number } | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      const name = validateString(body.name, 'name', 1, 100);
      updates.push('name = ?');
      values.push(name);
    }

    if (body.order_index !== undefined && body.order_index !== null) {
      const orderIndex = validateInteger(body.order_index, 'order_index', 0);
      updates.push('order_index = ?');
      values.push(orderIndex);
    }

    // Always update updated_at
    updates.push("updated_at = datetime('now')");

    // Execute update
    values.push(categoryId);
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Fetch updated category
    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(categoryId) as Category;

    return NextResponse.json({
      success: true,
      data: category,
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

    console.error('Category PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category (cascades to subcategories and cards)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    const { id } = await params;
    const categoryId = validateInteger(id, 'id', 1);

    const db = getDb();

    // Check if category exists
    const existing = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(categoryId) as { id: number } | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete category (cascade delete handled by database foreign keys)
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
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

    console.error('Category DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
