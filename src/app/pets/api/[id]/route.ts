import { fetchPetDetails } from '@/lib/petfinder';
export const dynamic = "auto"
export const revalidate = 3600

export async function GET(request: Request, { params }: { params: { id: string } }) {
    let id: string | undefined = params.id; // Declare id here
    try {
        if (!id) {
            console.error(`Pet ID not found in params`);
            return new Response(JSON.stringify({ message: 'Bad Request: Pet ID missing.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const petData = await fetchPetDetails(id!); 

        if (!petData || !petData.animal) {
            console.log(`Pet not found for ID: ${id}`);
            return new Response(JSON.stringify({ message: `Pet with ID ${id} not found.` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({ pet: petData.animal }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: unknown) {
        const errorContextId = id || 'unknown';
        console.error(`Error processing request for pet ID ${errorContextId}:`, error);

        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';

        return new Response(JSON.stringify({ message: 'Failed to process request due to a server error.', details: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}