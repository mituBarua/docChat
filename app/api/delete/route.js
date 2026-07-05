import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { filename } = await request.json()

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('metadata->>filename', filename)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}