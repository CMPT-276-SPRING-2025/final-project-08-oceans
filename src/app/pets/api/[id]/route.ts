import { fetchPetDetails } from '@/lib/petfinder';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    
    const { id } = await params;
    
    
    const data = await fetchPetDetails(id);

    console.log("API Response:", data)
    
    return new Response(JSON.stringify({ pet: data.animal }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}