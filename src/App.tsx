import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useWebSocket, GitHubEvent } from './hooks/useWebSocket';
import { useAudio } from './hooks/useAudio';
import Visualization from './components/Visualization';

// Styled Components
const AppContainer = styled.div`
  margin: 0;
  padding: 0;
//   background: conic-gradient(from 0deg, #A4B465, #F3C623, #FE5D26, #FFE99A, #4B70F5);
//   background-size: 400% 400%;
//   animation: gradient 15s ease infinite;
  background-color: #000;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 16px;
  overflow-x: hidden;
  min-height: 100vh;

//   @keyframes gradient {
//     0% {
//       background-position: 0% 50%;
//     }
//     50% {
//       background-position: 100% 50%;
//     }
//     100% {
//       background-position: 0% 50%;
//     }
//   }
`;

const ClickToPlay = styled.div<{ show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  width: 100%;
  height: 100%;
  text-align: center;
  display: ${props => props.show ? 'flex' : 'none'};
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

const Header = styled.header<{ isOnline: boolean }>`
  position: relative;
  width: 100%;
  height: 75px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  padding: 20px;
//   background-color: ${props => props.isOnline ? '#32746D' : '#E91E63'};
  transition: background-color 0.3s ease;
`;

const HeaderText = styled.h1`
  float: left;
  font-size: 1.6em;
  line-height: 1em;
  margin: 0;
`;

const OfflineText = styled.span<{ show: boolean }>`
  font-size: 0.4em;
  visibility: ${props => props.show ? 'visible' : 'hidden'};
`;

const EventsRemaining = styled.div`
  float: right;
  margin-right: 5%;
  margin-top: 30px;
  font-size: 0.8em;
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

const MainArea = styled.div<{ isOnline: boolean }>`
  width: 100%;
  position: relative;
  min-height: calc(100vh - 175px);
  background-color: transparent;
  transition: background-color 0.3s ease;
  overflow: hidden;
  filter: blur(100px);
`;

const BlobOuterContainer = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1000;
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
    background: conic-gradient(from 0deg, #A4B465, #F3C623, #FE5D26, #FFE99A, #4B70F5);
    animation: spinBlob 8s linear infinite;

    @keyframes spinBlob {
        0% {
            transform: rotate(0deg) scale(2);
        }

        100% {
            transform: rotate(1turn) scale(2);
        }
    }
`;

const OnlineUsersDiv = styled.div`
  text-align: center;
  position: absolute;
  bottom: 60px;
  width: 100%;
  margin: 0 auto;
  font-size: 0.9em;
  z-index: 1;
  opacity: 0.5;
  color: #fff;
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
      <ClickToPlay show={showClickToPlay}>
        <PlayButton
          src="/images/play-button.svg"
          alt="Click to play"
          onClick={handlePlayButtonClick}
        />
      </ClickToPlay>

      <Header isOnline={isOnline}>
        <HeaderText>
          Project Audio for GitHub&nbsp;
          <OfflineText show={!isOnline}>offline</OfflineText>
        </HeaderText>
        <EventsRemaining>
          <span>{eventQueue.length} events remaining in queue</span>
        </EventsRemaining>
        <VolumeSlider
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={handleVolumeChange}
        />
      </Header>

      <MainArea isOnline={isOnline}>
        <Visualization
          events={processedEvents}
          isOnline={isOnline}
        />
        <BlobOuterContainer>
            <BlobInnerContainer>
                <Blob />
            </BlobInnerContainer>
        </BlobOuterContainer>
        <OnlineUsersDiv>
          <h2>GitHub Audio - Real-time Event Visualization</h2>
        </OnlineUsersDiv>
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