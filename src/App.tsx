import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useWebSocket, GitHubEvent } from './hooks/useWebSocket';
import { useAudio } from './hooks/useAudio';
import Visualization from './components/Visualization';

// Styled Components
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

const Header = styled.header<{ $isOnline: boolean }>`
  position: relative;
  width: 100%;
  height: 75px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  padding: 20px;
  z-index: 1000;
  transition: background-color 0.3s ease;
`;

const HeaderText = styled.h1`
  float: left;
  font-size: 1.6em;
  line-height: 1em;
  margin: 0;
`;

const OfflineText = styled.span<{ $show: boolean }>`
  font-size: 0.4em;
  visibility: ${props => props.$show ? 'visible' : 'hidden'};
`;

const VolumeSlider = styled.input`
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
`;

const MainArea = styled.div<{ $isOnline: boolean }>`
  width: 100%;
  position: relative;
  min-height: 100vh;
  background-color: transparent;
  transition: background-color 0.3s ease;
  overflow: hidden;
`;

const BlobOuterContainer = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    filter: blur(100px);
`;

const BlobInnerContainer = styled.div`
    border-radius: 99999px;
    position: absolute;
    inset: 0;
    margin: auto;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transform: scale(0.8);
`;

const Blob = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
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

const ConfigArea = styled.div`
  width: 100%;
  background: #FFFFFF;
  min-height: 100px;
  padding: 40px;
  color: #555555;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
`;

const FilterDiv = styled.div`
  width: 50%;
  margin: 0 auto 20px auto;
  text-align: center;
`;

const FilterInput = styled.input`
  width: 320px;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: 'Inter', sans-serif;
`;

const SiteDescription = styled.div`
  text-align: center;
  margin-bottom: 20px;
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
  const processedCountRef = useRef(0);
  const eventQueueRef = useRef<GitHubEvent[]>([]);

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

  // Update eventQueue ref whenever eventQueue changes
  useEffect(() => {
    eventQueueRef.current = eventQueue;
  }, [eventQueue]);

  // Process events from queue
  useEffect(() => {
    if (!showClickToPlay && allSoundsLoaded) {
      let isProcessing = true;
      
      const playFromQueue = () => {
        if (!isProcessing) return;
        
        // Get next unprocessed event from queue using ref
        if (processedCountRef.current < eventQueueRef.current.length) {
          const event = eventQueueRef.current[processedCountRef.current];
          processedCountRef.current++;
          
          if (event && event.actor?.display_login) {
            const size = event.actor.display_login.length * 1.1;
            playSound(size, event.type);
            setProcessedEvents(prev => [...prev, event]);
          }
        }
        
        // Schedule next processing with random delay (500-1500ms)
        setTimeout(playFromQueue, Math.floor(Math.random() * 1000) + 500);
      };
      
      // Start processing after initial random delay
      setTimeout(playFromQueue, Math.floor(Math.random() * 1000));
      
      return () => {
        isProcessing = false;
      };
    }
  }, [showClickToPlay, allSoundsLoaded, playSound]);

  // Reset processed count when filter changes
  useEffect(() => {
    processedCountRef.current = 0;
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
            <HeaderText>
            Project Audio for GitHub&nbsp;
            <OfflineText $show={!isOnline}>offline</OfflineText>
            </HeaderText>
            <VolumeSlider
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
        <BlobOuterContainer>
            <BlobInnerContainer>
                <Blob />
            </BlobInnerContainer>
        </BlobOuterContainer>
      </MainArea>

      <ConfigArea>
        <FilterDiv>
          Enter your organization's or repository's names to filter events&nbsp;
          <FilterInput
            type="text"
            value={orgRepoFilter}
            onChange={handleFilterChange}
            placeholder="e.g. facebook react"
          />
        </FilterDiv>
        <SiteDescription>
          <p>Track events happening across GitHub and convert them to music notes.</p>
        </SiteDescription>
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