import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // Get user from database
    const userResult = await db.query(
      'SELECT id, email, password, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 });
    }

    const user = userResult.rows[0];
    const [firstName, ...lastNameParts] = (user.name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`User logged in: ${email}`);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: firstName || '',
          lastName: lastName || ''
        },
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Error in user login:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to login'
    }, { status: 500 });
  }
}
