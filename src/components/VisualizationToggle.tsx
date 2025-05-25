import React from 'react';
import styled from 'styled-components';

const ToggleContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 25px;
  padding: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ToggleButton = styled.button<{ $isActive: boolean }>`
  background: ${props => props.$isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'};
  color: ${props => props.$isActive ? '#fff' : '#ccc'};
  border: none;
  padding: 10px 16px;
  margin: 0 2px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$isActive 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : 'rgba(255, 255, 255, 0.1)'};
    color: #fff;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

interface VisualizationToggleProps {
  is3D: boolean;
  onToggle: (is3D: boolean) => void;
}

const VisualizationToggle: React.FC<VisualizationToggleProps> = ({ is3D, onToggle }) => {
  return (
    <ToggleContainer>
      <ToggleButton 
        $isActive={!is3D} 
        onClick={() => onToggle(false)}
        title="Switch to 2D visualization"
      >
        2D
      </ToggleButton>
      <ToggleButton 
        $isActive={is3D} 
        onClick={() => onToggle(true)}
        title="Switch to 3D visualization"
      >
        3D
      </ToggleButton>
    </ToggleContainer>
  );
};

export default VisualizationToggle; 