import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useWebSocket, GitHubEvent } from './hooks/useWebSocket';
import { useAudio } from './hooks/useAudio';
import Visualization from './components/Visualization';

// Styled Components - Optimized to reduce DOM elements
const AppContainer = styled.div`
  margin: 0;
  padding: 0;
  background-color: #000;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 16px;
  overflow-x: hidden;
  min-height: 100vh;
`;

const ClickToPlay = styled.div<{ $show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  width: 100%;
  height: 100%;
  text-align: center;
  display: ${props => props.$show ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
`;

const PlayButton = styled.img`
  width: 300px;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

// Combined Header with all header elements
const Header = styled.header<{ $isOnline: boolean }>`
  position: relative;
  width: 100%;
  height: 75px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  padding: 20px;
  z-index: 1000;
  transition: background-color 0.3s ease;
  
  h1 {
    float: left;
    font-size: 1.6em;
    line-height: 1em;
    margin: 0;
    
    span {
      font-size: 0.4em;
      visibility: ${props => props.$isOnline ? 'hidden' : 'visible'};
    }
  }
  
  input[type="range"] {
    position: absolute;
    top: 30px;
    right: 40px;
    width: 100px;
    opacity: 0.3;
    transition: opacity 0.2s ease;
    cursor: pointer;
    
    &:hover {
      opacity: 0.9;
    }
  }
`;

// Combined MainArea with blob background
const MainArea = styled.div<{ $isOnline: boolean }>`
  width: 100%;
  position: relative;
  min-height: 100vh;
  background-color: transparent;
  transition: background-color 0.3s ease;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 80%;
    height: 80%;
    z-index: 0;
    filter: blur(100px);
    border-radius: 99999px;
    margin: auto;
    background: conic-gradient(
      from 0deg,
      #90D1CA 0%,
      #7BCDC1 10%,
      #129990 20%,
      #6C4E4E 30%,
      #CB0404 40%,
      #D93C1B 50%,
      #FE5D26 60%,
      #FF7F35 70%,
      #FF9B45 80%,
      #927AF5 90%,
      #4B70F5 100%
    );
    animation: spinAndPulseBlob 30s cubic-bezier(0.77, 0, 0.175, 1) infinite,
               fadeBlob 15s ease-in-out infinite;
  }

  @keyframes spinAndPulseBlob {
    0% {
      transform: rotate(0deg) scale(1.95);
    }
    50% {
      transform: rotate(180deg) scale(2.05);
    }
    100% {
      transform: rotate(360deg) scale(1.95);
    }
  }

  @keyframes fadeBlob {
    0%, 100% {
      opacity: 0.85;
    }
    50% {
      opacity: 1;
    }
  }
`;

// Combined ConfigArea with all config elements
const ConfigArea = styled.div`
  width: 100%;
  background: #FFFFFF;
  min-height: 100px;
  padding: 40px;
  color: #555555;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  
  .filter-section {
    width: 50%;
    margin: 0 auto 20px auto;
    text-align: center;
    
    input {
      width: 320px;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: 'Inter', sans-serif;
    }
  }
  
  .description {
    text-align: center;
    margin-bottom: 20px;
  }
`;

const Footer = styled.footer`
  background: #f5f5f5;
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 0.9em;
`;

const App: React.FC = () => {
  const [showClickToPlay, setShowClickToPlay] = useState(true);
  const [volume, setVolumeState] = useState(0.5);
  const [orgRepoFilter, setOrgRepoFilter] = useState('');
  const [processedEvents, setProcessedEvents] = useState<GitHubEvent[]>([]);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse org/repo filter into array
  const orgRepoFilterArray = useMemo(() => {
    return orgRepoFilter.split(' ').filter(item => item.trim() !== '');
  }, [orgRepoFilter]);

  // Custom hooks
  const { isOnline, eventQueue, clearEventQueue } = useWebSocket(
    'wss://github-audio.fly.dev/events/',
    orgRepoFilterArray
  );

  const { allSoundsLoaded, playSound, setVolume } = useAudio();

  // Process events one at a time with proper delays (matching original implementation)
  const processNextEvent = useCallback(() => {
    if (!showClickToPlay && allSoundsLoaded && eventQueue.length > 0) {
      // Find the next unprocessed event using event_url as unique identifier
      const nextEvent = eventQueue.find(event => 
        event.event_url && !processedEventIdsRef.current.has(event.event_url)
      );
      
      if (nextEvent && nextEvent.actor?.display_login && nextEvent.event_url) {
        console.log(`Processing event: ${nextEvent.type} by ${nextEvent.actor.display_login} (URL: ${nextEvent.event_url.slice(-8)})`);
        
        // Mark as processed immediately
        processedEventIdsRef.current.add(nextEvent.event_url);
        
        // Play sound and add to visualization
        const size = nextEvent.actor.display_login.length * 1.1;
        playSound(size, nextEvent.type);
        setProcessedEvents(prev => {
          const newEvents = [...prev, nextEvent];
          // Keep only the last 100 processed events to prevent memory issues
          return newEvents.slice(-100);
        });
        
        console.log(`Processed count: ${processedEventIdsRef.current.size}, Queue length: ${eventQueue.length}`);
      } else if (eventQueue.length > 0) {
        console.log(`No new events to process (queue: ${eventQueue.length}, processed: ${processedEventIdsRef.current.size})`);
      }
      
      // Clean up the processed IDs set if it gets too large
      if (processedEventIdsRef.current.size > 200) {
        console.log(`Cleaning up processed URLs set (was ${processedEventIdsRef.current.size})`);
        // Keep only the most recent event URLs from the current queue
        const recentUrls = new Set<string>();
        eventQueue.slice(-100).forEach(event => {
          if (event.event_url) recentUrls.add(event.event_url);
        });
        processedEventIdsRef.current = recentUrls;
        console.log(`Cleaned up to ${processedEventIdsRef.current.size} URLs`);
      }
    }
    
    // Schedule next processing cycle with original timing: 500-1500ms delay
    const delay = Math.floor(Math.random() * 1000) + 500;
    processingTimeoutRef.current = setTimeout(processNextEvent, delay);
  }, [showClickToPlay, allSoundsLoaded, eventQueue, playSound]);

  // Start the processing loop when conditions are met
  useEffect(() => {
    if (!showClickToPlay && allSoundsLoaded) {
      // Clear any existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      // Start processing with initial delay
      const initialDelay = Math.floor(Math.random() * 1000) + 500;
      processingTimeoutRef.current = setTimeout(processNextEvent, initialDelay);
      
      return () => {
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }
      };
    }
  }, [showClickToPlay, allSoundsLoaded, processNextEvent]);

  // Clear processed events when filter changes
  useEffect(() => {
    setProcessedEvents([]);
    processedEventIdsRef.current.clear();
  }, [orgRepoFilter]);

  const handlePlayButtonClick = () => {
    setShowClickToPlay(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrgRepoFilter(e.target.value);
    clearEventQueue();
    setProcessedEvents([]);
  };

  return (
    <AppContainer>
      <ClickToPlay $show={showClickToPlay}>
        <PlayButton
          src="/images/play-button.svg"
          alt="Click to play"
          onClick={handlePlayButtonClick}
        />
      </ClickToPlay>

      <MainArea $isOnline={isOnline}>
        <Header $isOnline={isOnline}>
          <h1>
            Project Audio for GitHub&nbsp;
            <span>offline</span>
          </h1>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
          />
        </Header>
        <Visualization
          events={processedEvents}
          isOnline={isOnline}
        />
      </MainArea>

      <ConfigArea>
        <div className="filter-section">
          Enter your organization's or repository's names to filter events&nbsp;
          <input
            type="text"
            value={orgRepoFilter}
            onChange={handleFilterChange}
            placeholder="e.g. facebook react"
          />
        </div>
        <div className="description">
          <p>Track events happening across GitHub and convert them to music notes.</p>
        </div>
      </ConfigArea>

      <Footer>
        <div>
          <span>This project is not in any way affiliated with GitHub.</span><br/>
          This project is open source, you can view it on{' '}
          <a href="https://github.com/debugger22/github-audio" target="_blank" rel="noopener noreferrer">
            GitHub
          </a><br/>
          Developed by{' '}
          <a href="https://github.com/debugger22/github-audio" target="_blank" rel="noopener noreferrer">
            @debugger22
          </a><br/>
          ProTip: It's actually kind of nice to leave on the background
        </div>
      </Footer>
    </AppContainer>
  );
};

export default App; 