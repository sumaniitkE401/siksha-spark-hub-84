import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Volunteer {
  id: string;
  name: string;
  photo_url: string | null;
  programme: string | null;
}

const VolunteerCarousel = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  useEffect(() => {
    const fetchVolunteers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, photo_url, programme')
        .neq('role', 'admin')
        .neq('role', 'viewer')
        .limit(20);
      
      if (data) {
        setVolunteers(data);
      }
    };

    fetchVolunteers();
  }, []);

  if (volunteers.length === 0) return null;

  // Duplicate volunteers for seamless loop
  const displayVolunteers = [...volunteers, ...volunteers];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 py-6 mb-8 rounded-xl">
      <div className="flex items-center gap-4 animate-[scroll_30s_linear_infinite]">
        {displayVolunteers.map((volunteer, index) => (
          <div 
            key={`${volunteer.id}-${index}`}
            className="flex-shrink-0 flex flex-col items-center gap-2 px-3"
          >
            <Avatar className="h-16 w-16 ring-2 ring-primary/20 hover:ring-secondary transition-all duration-300 hover:scale-105">
              <AvatarImage 
                src={volunteer.photo_url || undefined} 
                alt={volunteer.name || 'Volunteer'} 
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {volunteer.name?.charAt(0) || 'V'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center min-w-0">
              <p className="text-sm font-medium text-foreground truncate max-w-20">
                {volunteer.name || 'Volunteer'}
              </p>
              {volunteer.programme && (
                <p className="text-xs text-muted-foreground truncate max-w-20">
                  {volunteer.programme}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolunteerCarousel;