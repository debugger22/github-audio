import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import styled from 'styled-components';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudio } from './hooks/useAudio';
import Visualization, { VisualizationRef } from './components/Visualization';
import VisualizationToggle from './components/VisualizationToggle';

// Lazy load the 3D visualization component
const Visualization3D = React.lazy(() => import('./components/Visualization3D'));

// Import the type separately for TypeScript
import type { Visualization3DRef } from './components/Visualization3D';

// Styled Components - Optimized to reduce DOM elements
const AppContainer = styled.div`
  margin: 0;
  padding: 0;
  background-color: #000;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
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
  padding: 20px 40px;
  z-index: 1000;
  transition: background-color 0.3s ease;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;

  @media (max-width: 768px) {
    padding: 10px 20px;
  }
  
  .logo {
    height: 60px;
    width: auto;
  }
  
  input[type="range"] {
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
      #FE7743 0%,
      #F1BA88 20%,
      #6C4E4E 30%,
      #3A59D1 40%,
      #3D90D7 50%,
      #0118D8 60%,
      #7965C1 70%,
      #483AA0 80%,
      #CF0F47 90%,
      #EA98DA 100%
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
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
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 10px;
`;

// Beautiful 3D Loading Fallback UI
const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const LoadingContent = styled.div`
  text-align: center;
  color: white;
  font-family: 'Inter', sans-serif;
`;

const LoadingTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease-in-out infinite;
  
  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
`;

const LoadingSubtitle = styled.p`
  font-size: 1.1rem;
  color: #a0a0a0;
  margin-bottom: 3rem;
  font-weight: 300;
`;

const LoadingSpinner = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 2rem;
`;

const SpinnerRing = styled.div<{ delay?: number }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top: 2px solid #4ecdc4;
  border-radius: 50%;
  animation: spin 2s linear infinite;
  animation-delay: ${props => props.delay || 0}s;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SpinnerCore = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  background: radial-gradient(circle, #ff6b6b, #4ecdc4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
  }
`;

const LoadingStars = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    animation: twinkle 3s ease-in-out infinite;
  }
  
  &::before {
    top: 20%;
    left: 15%;
    animation-delay: 0s;
  }
  
  &::after {
    top: 70%;
    right: 20%;
    animation-delay: 1.5s;
  }
  
  @keyframes twinkle {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.5); }
  }
`;

const LoadingProgress = styled.div`
  font-size: 0.9rem;
  color: #666;
  font-weight: 300;
  animation: fadeInOut 2s ease-in-out infinite;
  
  @keyframes fadeInOut {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

// Loading Fallback Component
const Loading3DFallback: React.FC = () => (
  <LoadingContainer>
    <LoadingStars />
    <LoadingContent>
      <LoadingTitle>Initializing 3D Universe</LoadingTitle>
      <LoadingSubtitle>Preparing cosmic visualization...</LoadingSubtitle>
      <LoadingSpinner>
        <SpinnerRing />
        <SpinnerRing delay={0.5} />
        <SpinnerCore />
      </LoadingSpinner>
      <LoadingProgress>Loading Three.js components</LoadingProgress>
    </LoadingContent>
  </LoadingContainer>
);

const App: React.FC = () => {
  const [showClickToPlay, setShowClickToPlay] = useState(true);
  const [volume, setVolumeState] = useState(() => {
    const savedVolume = localStorage.getItem('github-audio-volume');
    return savedVolume ? parseFloat(savedVolume) : 0.5;
  });
  const [orgRepoFilter, setOrgRepoFilter] = useState('');
  const [is3DMode, setIs3DMode] = useState(false);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visualizationRef = useRef<VisualizationRef>(null);
  const visualization3DRef = useRef<Visualization3DRef>(null);

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
        
        // Play sound
        const size = nextEvent.actor.display_login.length * 1.1;
        playSound(size, nextEvent.type);
        
        // Draw event in the appropriate visualization mode
        if (is3DMode && visualization3DRef.current) {
          visualization3DRef.current.drawEvent(nextEvent);
        } else if (!is3DMode && visualizationRef.current) {
          visualizationRef.current.drawEvent(nextEvent);
        }
        
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
  }, [showClickToPlay, allSoundsLoaded, eventQueue, playSound, is3DMode]);

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
    processedEventIdsRef.current.clear();
  }, [orgRepoFilter]);

  const handlePlayButtonClick = () => {
    setShowClickToPlay(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolumeState(newVolume);
    setVolume(newVolume);
    localStorage.setItem('github-audio-volume', newVolume.toString());
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrgRepoFilter(e.target.value);
    clearEventQueue();
    processedEventIdsRef.current.clear();
  };

  const handleToggle3DMode = (newIs3D: boolean) => {
    setIs3DMode(newIs3D);
  };

  return (
    <AppContainer>
      <ClickToPlay $show={showClickToPlay}>
        <PlayButton
          src="/images/play-button.svg"
          alt="Click to play"
          onClick={handlePlayButtonClick}
          fetchPriority="high"
        />
      </ClickToPlay>

      <MainArea $isOnline={isOnline}>
        <Header $isOnline={isOnline}>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            aria-label="Volume"
            onChange={handleVolumeChange}
          />
        </Header>
        {!is3DMode && (
          <Visualization
            ref={visualizationRef}
          />
        )}
        {is3DMode && (
          <Suspense fallback={<Loading3DFallback />}>
            <Visualization3D
              ref={visualization3DRef}
            />
          </Suspense>
        )}
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
          <img
            className="logo"
            src="/images/logo-60.avif"
            alt="GitHub Audio Logo"
            width={60}
            height={60}
            fetchPriority="high"
          />
          <span>This project is not in any way affiliated with GitHub.</span>
          <span>
            <a href="https://github.com/debugger22/github-audio" target="_blank" rel="noopener noreferrer">
              Source Code
            </a>
          </span>
          <span>
            Developed by{' '} <a href="https://github.com/debugger22" target="_blank" rel="noopener noreferrer">@debugger22</a>
          </span>
          <span>
            ProTip: It's actually kind of nice to leave on the background
          </span>
      </Footer>

      <VisualizationToggle
        is3D={is3DMode}
        onToggle={handleToggle3DMode}
      />
    </AppContainer>
  );
};

export default App; 