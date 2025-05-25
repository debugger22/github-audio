import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { GitHubEvent } from '../hooks/useWebSocket';

const VisualizationContainer = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
`;

const SVGContainer = styled.svg`
  width: 100%;
  height: 100%;
  background-color: transparent;
  display: block;
`;

interface VisualizationProps {
  events: GitHubEvent[];
  isOnline: boolean;
}

const Visualization: React.FC<VisualizationProps> = ({ 
  events, 
  isOnline
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processedCountRef = useRef(0);

  // Function to draw a single event immediately
  const drawEvent = useCallback((event: GitHubEvent) => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Original constants
    const scaleFactor = 6;
    const maxLife = 20000;
    let svgTextColor = '#FFFFFF';
    
    // Calculate opacity like original
    const startingOpacity = 1;
    let opacity = 1 / (100 / event.actor.display_login.length);
    if (opacity > 0.5) {
      opacity = 0.5;
    }
    
    // Original size calculation
    let size = event.actor.display_login.length;
    let labelText = '';
    let ringRadius = 80;
    let ringAnimDuration = 3000;
    let editColor = '';

    // Event-specific colors and settings (exact from original)
    switch (event.type) {
      case 'PushEvent':
        labelText = `${event.actor.display_login} pushed to ${event.repo.name}`;
        editColor = '#FFF9A5';
        break;
      case 'PullRequestEvent':
        labelText = `${event.actor.display_login} ${event.action || 'updated'} a PR for ${event.repo.name}`;
        editColor = '#C6FF00';
        ringAnimDuration = 10000;
        ringRadius = 600;
        break;
      case 'IssuesEvent':
        labelText = `${event.actor.display_login} ${event.action || 'updated'} an issue in ${event.repo.name}`;
        editColor = '#DFEFCA';
        break;
      case 'IssueCommentEvent':
        labelText = `${event.actor.display_login} ${event.action || 'commented'} in ${event.repo.name}`;
        editColor = '#CCDDD3';
        break;
      default:
        labelText = `${event.actor.display_login} updated ${event.repo.name}`;
        editColor = '#BDC3C7';
    }

    const csize = size;
    const type = event.type;
    
    // Generate unique ID
    const circleId = 'd' + Math.floor(Math.random() * 100000);
    const absSize = Math.abs(size);
    
    // Original size calculation
    size = Math.max(Math.sqrt(absSize) * scaleFactor, 3);

    // Seeded random positioning (using event URL as seed)
    // Note: We'll use a simple hash of the URL since we don't have seedrandom
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };
    
    const seed = hashCode(event.event_url || event.id);
    const seededRandom1 = (seed % 10000) / 10000;
    const seededRandom2 = ((seed * 9301 + 49297) % 233280) / 233280;
    
    const x = seededRandom1 * (width - size) + size;
    const y = seededRandom2 * (height - size) + size;

    // Create group for circle and text (like original)
    const circleGroup = svg.append('g')
      .attr('transform', `translate(${x}, ${y})`)
      .attr('fill', editColor)
      .style('opacity', startingOpacity);

    // Ring animation (outer expanding ring)
    const ring = circleGroup.append('circle');
    ring.attr('r', size)
      .attr('stroke', 'none')
      .attr('fill', editColor)
      .style('opacity', opacity)
      .transition()
      .attr('r', size + ringRadius)
      .style('opacity', 0)
      .ease(d3.easePoly.exponent(0.5))
      .duration(ringAnimDuration)
      .remove();

    // Clickable container
    const circleContainer = circleGroup.append('a');
    if (event.event_url) {
      circleContainer.attr('href', event.event_url);
      circleContainer.attr('target', '_blank');
    }
    circleContainer.attr('fill', svgTextColor);

    // Main circle
    const circle = circleContainer.append('circle');
    circle.classed(type, true);
    circle.attr('r', size)
      .attr('fill', editColor)
      .style('opacity', opacity)
      .transition()
      .duration(maxLife)
      .style('opacity', 0)
      .remove();

    // Mouseover label
    circleContainer.on('mouseover', function() {
      circleContainer.append('text')
        .text(labelText)
        .classed('label', true)
        .attr('text-anchor', 'middle')
        .attr('y', '0.3em')
        .attr('fill', svgTextColor)
        .attr('font-size', '12px')
        .attr('font-family', 'Inter, sans-serif')
        .style('pointer-events', 'none')
        .transition()
        .delay(10)
        .style('opacity', 0)
        .duration(200)
        .remove();
    });

    // Article label (always visible initially)
    circleContainer.append('text')
      .text(labelText)
      .classed('article-label', true)
      .attr('text-anchor', 'middle')
      .attr('y', '0.3em')
      .attr('fill', svgTextColor)
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .transition()
      .delay(2000)
      .style('opacity', 0)
      .duration(5000)
      .remove();

    // Cleanup old events (keep less than 50)
    const allGroups = svg.selectAll('g');
    if (allGroups.size() > 50) {
      // Remove the first 10 oldest groups
      allGroups.nodes().slice(0, 10).forEach(node => {
        d3.select(node).remove();
      });
    }
  }, []);

  // Draw new events as they arrive (only draw new ones)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Set SVG dimensions
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.attr('width', width).attr('height', height);

    // Draw only new events that haven't been processed yet
    for (let i = processedCountRef.current; i < events.length; i++) {
      const event = events[i];
      drawEvent(event);
    }
    
    // Update processed count
    processedCountRef.current = events.length;
  }, [events, drawEvent]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!svgRef.current || !containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      const svg = d3.select(svgRef.current);
      svg.attr('width', newWidth).attr('height', newHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <VisualizationContainer ref={containerRef}>
      <SVGContainer ref={svgRef} />
    </VisualizationContainer>
  );
};

export default Visualization; 