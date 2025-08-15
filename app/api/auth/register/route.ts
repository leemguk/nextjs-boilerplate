import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const ALLOWED_DOMAINS = ['ransomspares.co.uk'];

function isAllowedEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required'
      }, { status: 400 });
    }

    // Check if email domain is allowed
    if (!isAllowedEmail(email)) {
      return NextResponse.json({
        success: false,
        error: 'Registration is currently private'
      }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'User already exists'
      }, { status: 400 });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const userResult = await db.query(`
      INSERT INTO users (id, email, name, password, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, email, name
    `, [
      Date.now().toString(),
      email.toLowerCase(),
      `${firstName} ${lastName}`,
      hashedPassword
    ]);

    const user = userResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    console.log(`New user registered: ${email}`);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName,
          lastName
        },
        token
      },
      message: 'User registered successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in user registration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to register user'
    }, { status: 500 });
  }
}
