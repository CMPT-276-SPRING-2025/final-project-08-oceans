import { fetchPetDetails } from '@/lib/petfinder';
import { NextResponse } from 'next/server';

export const dynamic = "auto";
export const revalidate = 3600;


export async function GET(
    request: Request, { params }
) {

    const { id } = await params;

    try {

        const petData = await fetchPetDetails(id);

        if (!petData || !petData.animal) {
            
            return NextResponse.json(
                { message: `Pet with ID ${id} not found.` },
                { status: 404 }
            );
        }


        return NextResponse.json(
            { pet: petData.animal }, 
            { status: 200 }
        );

    } catch (error: unknown) {

        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';

        return NextResponse.json(
            { message: 'Failed to process request due to a server error.', details: errorMessage },
            { status: 500 }
        );
    }
}