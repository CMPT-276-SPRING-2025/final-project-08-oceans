import { GET } from '../../../../src/app/pets/route';
import { GET as getPetById } from '../../../../src/app/pets/api/[id]/route';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

process.env.PETFINDER_KEY = 'test-key';
process.env.PETFINDER_SECRET = 'test-secret';

console.log = jest.fn();
console.error = jest.fn();

global.fetch = jest.fn();

const mockFetch = (response: any, ok = true) => {
  return jest.fn().mockResolvedValueOnce({
    ok,
    json: jest.fn().mockResolvedValueOnce(response),
    statusText: ok ? 'OK' : 'Error',
  });
};

describe('Pets API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockClear();
    (console.log as jest.Mock).mockClear();
  });

  describe('GET /api/pets', () => {
    it('should return simplified pets data on successful response', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          animals: [
            {
              id: 1,
              type: { name: 'Dog' },
              breeds: { primary: 'Labrador', secondary: null, mixed: false, unknown: false },
              age: 'Young',
              name: 'Max',
              gender: 'Male',
              size: 'Large',
              photos: []
            },
            {
              id: 2,
              type: { name: 'Cat' },
              breeds: { primary: 'Siamese', secondary: null, mixed: false, unknown: false },
              age: 'Adult',
              name: 'Felix',
              gender: 'Female',
              size: 'Medium',
              photos: []
            }
          ],
          pagination: {
            count_per_page: 20,
            total_count: 2,
            current_page: 1,
            total_pages: 1,
          },
        })
      );

      const request = new Request('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.pets).toEqual([
        {
          id: 1,
          type: 'Dog',
          breed: 'Labrador',
          age: 'Young',
          gender: 'Male',
          size: 'Large',
          name: 'Max',
          photos: []
        },
        {
          id: 2,
          type: 'Cat',
          breed: 'Siamese',
          age: 'Adult',
          gender: 'Female',
          size: 'Medium',
          name: 'Felix',
          photos: []
        }
      ]);
      
      expect(responseData.pagination).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle query parameters correctly', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          animals: [],
          pagination: {
            count_per_page: 20,
            total_count: 0,
            current_page: 1,
            total_pages: 0,
          },
        })
      );

      const request = new Request('http://localhost:3000/api/pets?type=Dog&breed=Labrador&age=Young');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('type=Dog&breed=Labrador&age=Young&page=1&limit=100'),
        expect.anything()
      );
    });

    it('should handle empty response without volatile failure', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          animals: [],
          pagination: {
            count_per_page: 20,
            total_count: 0,
            current_page: 1,
            total_pages: 0,
          },
        })
      );

      const request = new Request('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.pets).toEqual([]);
    });

    it('should handle authentication failure', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({ error: 'invalid_client' }, false)
      );

      const request = new Request('http://localhost:3000/api/pets');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Failed to fetch pets' });
    });

    it('should handle Petfinder API failure', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({ error: 'server_error' }, false)
      );

      const request = new Request('http://localhost:3000/api/pets');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Failed to fetch pets' });
    });

    // New tests for different pet types
    const petTypes = ['Cat', 'Dog', 'Bird', 'Small & Furry', 'Scales, Fins & Other', 'Barnyard'];
    
    petTypes.forEach(petType => {
      it(`should fetch ${petType} pets correctly`, async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(
          mockFetch({
            token_type: 'Bearer',
            expires_in: 3600,
            access_token: 'mock-token',
          })
        );

        (global.fetch as jest.Mock).mockImplementationOnce(
          mockFetch({
            animals: [
              {
                id: 1,
                type: { name: petType },
                breeds: { primary: 'Mixed', secondary: null, mixed: true, unknown: false },
                age: 'Young',
                name: `Test ${petType}`,
                gender: 'Male',
                size: 'Medium',
                photos: []
              }
            ],
            pagination: {
              count_per_page: 20,
              total_count: 1,
              current_page: 1,
              total_pages: 1,
            },
          })
        );

        const encodedType = encodeURIComponent(petType);
        const request = new Request(`http://localhost:3000/api/pets?type=${encodedType}`);
        const response = await GET(request);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        
        expect(responseData.pets).toHaveLength(1);
        expect(responseData.pets[0].type).toBe(petType);
        
        if (petType === 'Small & Furry') {
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "https://api.petfinder.com/v2/animals?type=Small+%26+Furry&page=1&limit=100",
            {
              headers: {
                Authorization: "Bearer mock-token",
              },
              next: {
                revalidate: 3600,
              },
            }
          );
        } else if (petType === 'Scales, Fins & Other') {
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "https://api.petfinder.com/v2/animals?type=Scales%2C+Fins+%26+Other&page=1&limit=100",
            {
              headers: {
                Authorization: "Bearer mock-token",
              },
              next: {
                revalidate: 3600,
              },
            }
          );
        } else {
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining(`type=${encodedType}`),
            expect.anything()
          );
        }
      });
    });

    it('should filter pets by location correctly', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          animals: [
            {
              id: 1,
              type: { name: 'Dog' },
              breeds: { primary: 'Labrador', secondary: null, mixed: false, unknown: false },
              age: 'Young',
              name: 'Max',
              gender: 'Male',
              size: 'Large',
              photos: [],
              contact: {
                address: {
                  city: 'San Francisco',
                  state: 'CA',
                  postcode: '94103',
                  country: 'US'
                }
              },
              distance: 5.2
            },
            {
              id: 2,
              type: { name: 'Cat' },
              breeds: { primary: 'Siamese', secondary: null, mixed: false, unknown: false },
              age: 'Adult',
              name: 'Felix',
              gender: 'Female',
              size: 'Medium',
              photos: [],
              contact: {
                address: {
                  city: 'San Francisco',
                  state: 'CA',
                  postcode: '94103',
                  country: 'US'
                }
              },
              distance: 7.8
            }
          ],
          pagination: {
            count_per_page: 20,
            total_count: 2,
            current_page: 1,
            total_pages: 1,
          },
        })
      );

      const location = 'San Francisco, CA';
      const request = new Request(`http://localhost:3000/api/pets?location=${encodeURIComponent(location)}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.pets).toHaveLength(2);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "https://api.petfinder.com/v2/animals?page=1&limit=100&location=San+Francisco%2C+CA&sort=distance",
        {
          headers: {
            Authorization: "Bearer mock-token",
          },
          next: {
            revalidate: 3600,
          },
        }
      );
    });
  });

  describe('GET /api/pets/[id]', () => {
    it('should return detailed pet information by ID', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          animal: {
            id: 123,
            type: { name: 'Dog' },
            breeds: { primary: 'Golden Retriever', secondary: null, mixed: false, unknown: false },
            age: 'Young',
            name: 'Buddy',
            gender: 'Male',
            size: 'Large',
            description: 'Friendly and playful golden retriever',
            photos: [
              {
                small: 'https://example.com/small.jpg',
                medium: 'https://example.com/medium.jpg',
                large: 'https://example.com/large.jpg',
                full: 'https://example.com/full.jpg'
              }
            ],
            status: 'adoptable',
            attributes: {
              spayed_neutered: true,
              house_trained: true,
              declawed: false,
              special_needs: false,
              shots_current: true
            },
            environment: {
              children: true,
              dogs: true,
              cats: null
            },
            contact: {
              email: 'info@shelter.org',
              phone: '123-456-7890',
              address: {
                address1: '123 Main St',
                address2: null,
                city: 'Anytown',
                state: 'CA',
                postcode: '12345',
                country: 'US'
              }
            },
            published_at: '2023-01-01T12:00:00Z',
            organization_id: 'shelter123'
          }
        })
      );

      const url = new URL('http://localhost:3000/pets/api/123');
      const request = new Request(url);
      
      const response = await getPetById(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.pet).toEqual(expect.objectContaining({
        id: 123,
        type: { name: 'Dog' },
        breeds: { primary: 'Golden Retriever', secondary: null, mixed: false, unknown: false },
        age: 'Young',
        gender: 'Male',
        size: 'Large',
        name: 'Buddy',
        description: 'Friendly and playful golden retriever',
        status: 'adoptable',
        photos: expect.any(Array),
        attributes: expect.any(Object),
        environment: expect.any(Object),
        contact: expect.any(Object),
        organization_id: 'shelter123'
      }));
      
      expect(responseData.pet.organization_id).toBe('shelter123');
    });

    it('should handle pet not found error', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({ status: 'not found' }, false)
      );

      const url = new URL('http://localhost:3000/pets/api/999');
      const request = new Request(url);
      
      const response = await getPetById(request);

      expect(response.status).toBe(404);
      const responseData = await response.json();
      
      expect(responseData.message).toBe('Pet with ID 999 not found.');
    });

    it('should verify pet has all required characteristics', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: 'mock-token',
        })
      );

      (global.fetch as jest.Mock).mockImplementationOnce(
        mockFetch({
          animal: {
            id: 456,
            type: { name: 'Cat' },
            breeds: { primary: 'Siamese', secondary: 'Tabby', mixed: true, unknown: false },
            age: 'Adult',
            name: 'Whiskers',
            gender: 'Female',
            size: 'Medium',
            description: 'Sweet and calm cat',
            photos: [],
            status: 'adoptable',
            attributes: {
              spayed_neutered: true,
              house_trained: true,
              declawed: false,
              special_needs: false,
              shots_current: true
            },
            environment: {
              children: true,
              dogs: false,
              cats: true
            },
            contact: {
              email: 'info@catshelter.org',
              phone: '555-123-4567',
              address: {
                address1: '456 Cat St',
                address2: null,
                city: 'Catville',
                state: 'NY',
                postcode: '54321',
                country: 'US'
              }
            },
            published_at: '2023-02-15T10:00:00Z',
            organization_id: 'shelter456'
          }
        })
      );

      const url = new URL('http://localhost:3000/pets/api/456');
      const request = new Request(url);
      
      const response = await getPetById(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      const pet = responseData.pet;
      expect(pet).toHaveProperty('type', { name: 'Cat' });
      expect(pet).toHaveProperty('breeds', { 
        primary: 'Siamese', 
        secondary: 'Tabby', 
        mixed: true, 
        unknown: false 
      });
      expect(pet).toHaveProperty('age', 'Adult');
      expect(pet).toHaveProperty('gender', 'Female');
      expect(pet).toHaveProperty('size', 'Medium');
      expect(pet).toHaveProperty('name', 'Whiskers');
      expect(pet).toHaveProperty('description');
      expect(pet).toHaveProperty('attributes');
      expect(pet).toHaveProperty('environment');
      expect(pet).toHaveProperty('contact');
      expect(pet).toHaveProperty('organization_id');
      
      expect(pet.attributes).toEqual(expect.objectContaining({
        spayed_neutered: true,
        house_trained: true,
        declawed: false,
        special_needs: false,
        shots_current: true
      }));
      
      expect(pet.environment).toEqual(expect.objectContaining({
        children: true,
        dogs: false,
        cats: true
      }));
    });
  });
});
