import { useRef, useCallback, useEffect, useState } from 'react';
import { Howl, Howler } from 'howler';

interface UseAudioReturn {
  allSoundsLoaded: boolean;
  playRandomSwell: () => void;
  playSound: (size: number, type: string) => void;
  setVolume: (volume: number) => void;
}

export const useAudio = (): UseAudioReturn => {
  const [allSoundsLoaded, setAllSoundsLoaded] = useState(false);
  const celestaRef = useRef<Howl[]>([]);
  const clavRef = useRef<Howl[]>([]);
  const swellsRef = useRef<Howl[]>([]);
  
  // Throttling variables to match original
  const currentNotesRef = useRef(0);
  const noteOverlap = 2;
  const noteTimeout = 300;

  useEffect(() => {
    const loadSounds = () => {
      const celesta: Howl[] = [];
      const clav: Howl[] = [];
      const swells: Howl[] = [];
      
      let loadedSounds = 0;
      const totalSounds = 51; // 24 celesta + 24 clav + 3 swells

      const onSoundLoad = () => {
        loadedSounds++;
        if (loadedSounds === totalSounds) {
          setAllSoundsLoaded(true);
        }
      };

      // Load celesta and clav sounds
      for (let i = 1; i <= 24; i++) {
        const fn = i > 9 ? `c0${i}` : `c00${i}`;
        
        celesta.push(new Howl({
          src: [
            `/sounds/celesta/${fn}.ogg`,
            `/sounds/celesta/${fn}.mp3`
          ],
          volume: 0.7,
          onload: onSoundLoad,
          onloaderror: (_id, error) => console.error(`Failed to load celesta/${fn}:`, error),
        }));

        clav.push(new Howl({
          src: [
            `/sounds/clav/${fn}.ogg`,
            `/sounds/clav/${fn}.mp3`
          ],
          volume: 0.4,
          onload: onSoundLoad,
          onloaderror: (_id, error) => console.error(`Failed to load clav/${fn}:`, error),
        }));
      }

      // Load swell sounds
      for (let i = 1; i <= 3; i++) {
        swells.push(new Howl({
          src: [
            `/sounds/swells/swell${i}.ogg`,
            `/sounds/swells/swell${i}.mp3`
          ],
          volume: 1,
          onload: onSoundLoad,
          onloaderror: (_id, error) => console.error(`Failed to load swells/swell${i}:`, error),
        }));
      }

      celestaRef.current = celesta;
      clavRef.current = clav;
      swellsRef.current = swells;
    };

    loadSounds();
  }, []);

  const playRandomSwell = useCallback(() => {
    if (swellsRef.current.length > 0) {
      const index = Math.round(Math.random() * (swellsRef.current.length - 1));
      swellsRef.current[index].play();
    } else {
      console.error('No swell sounds available');
    }
  }, []);

  const playSound = useCallback((size: number, type: string) => {
    if (!allSoundsLoaded) {
      return;
    }

    // Exact original logic
    const maxPitch = 100.0;
    const logUsed = 1.0715307808111486871978099;
    const pitch = 100 - Math.min(maxPitch, Math.log(size + logUsed) / Math.log(logUsed));
    let index = Math.floor((pitch / 100.0) * Object.keys(celestaRef.current).length);
    
    // Add random fuzz for musicality
    const fuzz = Math.floor(Math.random() * 4) - 2;
    index += fuzz;
    
    // Clamp index to valid range
    index = Math.min(Object.keys(celestaRef.current).length - 1, index);
    index = Math.max(1, index);
    
    // Throttling - only play if we haven't exceeded max concurrent notes
    if (currentNotesRef.current < noteOverlap) {
      currentNotesRef.current++;
      
      // Sound selection logic matching original
      if (type === 'IssuesEvent' || type === 'IssueCommentEvent') {
        if (clavRef.current[index]) {
          clavRef.current[index].play();
        } else {
          console.error('Clav sound not found at index:', index);
        }
      } else if (type === 'PushEvent') {
        if (celestaRef.current[index]) {
          celestaRef.current[index].play();
        } else {
          console.error('Celesta sound not found at index:', index);
        }
      } else {
        playRandomSwell();
      }
      
      // Reset note count after timeout
      setTimeout(() => {
        currentNotesRef.current--;
      }, noteTimeout);
    }
  }, [allSoundsLoaded, playRandomSwell]);

  const setVolume = useCallback((volume: number) => {
    Howler.volume(volume);
  }, []);

  return {
    allSoundsLoaded,
    playRandomSwell,
    playSound,
    setVolume,
  };
}; 