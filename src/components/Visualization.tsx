import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { GitHubEvent } from '../hooks/useWebSocket';

// Combined container and SVG - reduces one DOM element per visualization
const SVGContainer = styled.svg`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  background-color: transparent;
  display: block;
`;

interface VisualizationProps {
  events: GitHubEvent[];
  isOnline: boolean;
}

const Visualization: React.FC<VisualizationProps> = ({ 
  events
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const processedCountRef = useRef(0);

  // Function to draw a single event immediately - optimized to reduce DOM elements
  const drawEvent = useCallback((event: GitHubEvent) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Constants
    const scaleFactor = 6;
    const maxLife = 20000;
    const svgTextColor = '#FFFFFF';
    
    // Calculate opacity
    const startingOpacity = 1;
    let opacity = 1 / (100 / event.actor.display_login.length);
    if (opacity > 0.5) {
      opacity = 0.5;
    }
    
    // Size and event-specific settings
    let size = event.actor.display_login.length;
    let labelText = '';
    let ringRadius = 80;
    let ringAnimDuration = 3000;
    let editColor = '';

    // Event-specific colors and settings
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

    const absSize = Math.abs(size);
    size = Math.max(Math.sqrt(absSize) * scaleFactor, 3);

    // Seeded random positioning
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    const seed = hashCode(event.event_url || event.id);
    const seededRandom1 = (seed % 10000) / 10000;
    const seededRandom2 = ((seed * 9301 + 49297) % 233280) / 233280;
    
    const x = seededRandom1 * (width - size) + size;
    const y = seededRandom2 * (height - size) + size;

    // Optimized: Create single group instead of nested groups
    const eventGroup = svg.append('g')
      .attr('transform', `translate(${x}, ${y})`)
      .attr('fill', editColor)
      .style('opacity', startingOpacity);

    // Ring animation (outer expanding ring)
    eventGroup.append('circle')
      .attr('r', size)
      .attr('stroke', 'none')
      .attr('fill', editColor)
      .style('opacity', opacity)
      .transition()
      .attr('r', size + ringRadius)
      .style('opacity', 0)
      .ease(d3.easePoly.exponent(0.5))
      .duration(ringAnimDuration)
      .remove();

    // Main circle with click handler - reduced nesting
    const mainCircle = eventGroup.append('circle')
      .classed(event.type, true)
      .attr('r', size)
      .attr('fill', editColor)
      .style('opacity', opacity)
      .style('cursor', event.event_url ? 'pointer' : 'default');

    // Add click handler if URL exists (before transition)
    if (event.event_url) {
      mainCircle.on('click', () => {
        window.open(event.event_url, '_blank');
      });
    }

    // Optimized: Single text element that changes on hover instead of creating new ones
    const textElement = eventGroup.append('text')
      .text(labelText)
      .attr('text-anchor', 'middle')
      .attr('y', '0.3em')
      .attr('fill', svgTextColor)
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '500')
      .style('pointer-events', 'none');

    // Hover effects on the main circle (before transition)
    mainCircle
      .on('mouseover', function() {
        textElement.style('opacity', 1).attr('font-size', '12px');
      })
      .on('mouseout', function() {
        textElement.style('opacity', 0.7).attr('font-size', '11px');
      });

    // Apply transition after event handlers are set
    mainCircle.transition()
      .duration(maxLife)
      .style('opacity', 0)
      .remove();

    // Text fade out animation
    textElement.transition()
      .delay(2000)
      .style('opacity', 0)
      .duration(5000)
      .remove();

    // More aggressive cleanup - keep fewer elements
    const allGroups = svg.selectAll('g');
    if (allGroups.size() > 30) {
      // Remove the first 15 oldest groups
      allGroups.nodes().slice(0, 15).forEach(node => {
        d3.select(node).remove();
      });
    }
  }, []);

  // Draw new events as they arrive
  useEffect(() => {
    if (!svgRef.current) return;

    // Set SVG dimensions
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
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
      if (!svgRef.current) return;
      const newWidth = svgRef.current.clientWidth;
      const newHeight = svgRef.current.clientHeight;
      const svg = d3.select(svgRef.current);
      svg.attr('width', newWidth).attr('height', newHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <SVGContainer ref={svgRef} />
  );
};

export default Visualization; 