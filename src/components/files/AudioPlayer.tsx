import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getSignedAssetUrl } from '@/utils/getSignedAssetUrl';

interface AudioPlayerProps {
  fileKey: string;
  sizeMb: number;
  fileName: string;
}

const MAX_PREVIEW_SIZE_MB = 750;

export function AudioPlayer({ fileKey, sizeMb, fileName }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if file is too large for preview
  const isTooLarge = sizeMb > MAX_PREVIEW_SIZE_MB;

  // Update current time and handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioUrl]);

  const initializeAudio = async () => {
    if (hasInitialized || isTooLarge) return;
    
    setIsLoading(true);
    try {
      const signedUrl = await getSignedAssetUrl(fileKey);
      setAudioUrl(signedUrl);
      setHasInitialized(true);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      // Show user-friendly error
      alert('Error loading audio file. Please try again or download the file.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    
    // Initialize audio on first play
    if (!hasInitialized) {
      await initializeAudio();
      return;
    }
    
    if (!audio || !audioUrl) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && hasInitialized) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    const newVolume = value[0];
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isMuted) {
        audio.volume = volume;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const PlayButton = () => {
    if (isTooLarge) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-shrink-0 opacity-50"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Files &gt; {MAX_PREVIEW_SIZE_MB} MB must be downloaded</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlay}
        disabled={isLoading}
        className="flex-shrink-0"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    );
  };

  return (
    <div className="w-full space-y-3 p-3 bg-muted/50 rounded-lg">
      {audioUrl && hasInitialized && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="none"
        />
      )}
      
      <div className="flex items-center space-x-3">
        <PlayButton />

        <div className="flex-1 space-y-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
            disabled={!hasInitialized || isTooLarge}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            disabled={!hasInitialized || isTooLarge}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-20"
            disabled={!hasInitialized || isTooLarge}
          />
        </div>
      </div>
    </div>
  );
}