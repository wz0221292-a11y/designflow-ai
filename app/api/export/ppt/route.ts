import { NextRequest, NextResponse } from 'next/server';
import { canExport, getActivePlan, MEMBERSHIP_ENABLED } from '@/lib/membership';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { generatePPT } from '@/lib/export/pptGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userId } = body;

    if (!projectId || (MEMBERSHIP_ENABLED && !userId)) {
      return NextResponse.json({ error: 'Project ID and User ID are required' }, { status: 400 });
    }

    if (MEMBERSHIP_ENABLED) {
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 404 });
      }

      if (!canExport(getActivePlan(profile))) {
        return NextResponse.json({ error: '请先充值会员后再导出文件' }, { status: 403 });
      }
    }

    // Fetch project data
    const { data, error } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // If selectedAppearance is provided, override appearance_images to only include the selected one
    const project = data as any;
    if (body.selectedAppearance && project.appearance_images?.length > 0) {
      project.appearance_images = [body.selectedAppearance];
    }

    // Generate PPT
    const pptBuffer = await generatePPT(project, body.includeSections);

    const filename = project.product_intro?.name || 'design';

    // Return the file
    return new NextResponse(new Uint8Array(pptBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${filename}.pptx`)}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}