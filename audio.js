// Audio System for Last Offering
// Procedural audio generation and atmospheric sounds

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.musicVolume = 0.2;
        this.sfxVolume = 0.4;
        this.currentMusic = null;
        this.sounds = new Map();
        this.musicLoop = null;
        this.initialized = false;
        
        // Initialize audio on user interaction
        this.initializeAudio();
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    createSounds() {
        // Create procedural sound effects
        this.createJumpSound();
        this.createLandingSound();
        this.createDamageSound();
        this.createSacrificeSound();
        this.createCompanionWeakenSound();
        this.createAmbientMusic();
    }

    createJumpSound() {
        this.sounds.set('jump', () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.type = 'sine';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        });
    }

    createLandingSound() {
        this.sounds.set('landing', () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
            
            oscillator.type = 'triangle';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.15);
        });
    }

    createDamageSound() {
        this.sounds.set('damage', () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.type = 'sawtooth';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        });
    }

    createSacrificeSound() {
        this.sounds.set('sacrifice', () => {
            // Create a haunting, ethereal sound for sacrifices
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const reverb = this.createReverb();
            
            oscillator1.connect(reverb);
            oscillator2.connect(reverb);
            reverb.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator1.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator1.frequency.linearRampToValueAtTime(220, this.audioContext.currentTime + 2);
            
            oscillator2.frequency.setValueAtTime(660, this.audioContext.currentTime);
            oscillator2.frequency.linearRampToValueAtTime(330, this.audioContext.currentTime + 2);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
            
            oscillator1.type = 'sine';
            oscillator2.type = 'sine';
            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(this.audioContext.currentTime + 2);
            oscillator2.stop(this.audioContext.currentTime + 2);
        });
    }

    createCompanionWeakenSound() {
        this.sounds.set('companion_weaken', () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            lfo.frequency.setValueAtTime(5, this.audioContext.currentTime);
            lfoGain.gain.setValueAtTime(20, this.audioContext.currentTime);
            
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, this.audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
            
            oscillator.type = 'sine';
            lfo.type = 'sine';
            lfo.start();
            oscillator.start();
            lfo.stop(this.audioContext.currentTime + 1);
            oscillator.stop(this.audioContext.currentTime + 1);
        });
    }

    createReverb() {
        const convolver = this.audioContext.createConvolver();
        const length = this.audioContext.sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }

    createAmbientMusic() {
        // Create procedural ambient music
        this.musicLoop = () => {
            if (!this.initialized || this.audioContext.state !== 'running') return;
            
            // Create base drone
            const drone = this.audioContext.createOscillator();
            const droneGain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            drone.connect(filter);
            filter.connect(droneGain);
            droneGain.connect(this.audioContext.destination);
            
            drone.frequency.setValueAtTime(55, this.audioContext.currentTime); // Low A
            drone.type = 'triangle';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            filter.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 8);
            filter.frequency.linearRampToValueAtTime(200, this.audioContext.currentTime + 16);
            
            droneGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            droneGain.gain.linearRampToValueAtTime(this.musicVolume * 0.1, this.audioContext.currentTime + 2);
            droneGain.gain.linearRampToValueAtTime(this.musicVolume * 0.05, this.audioContext.currentTime + 14);
            droneGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 16);
            
            drone.start();
            drone.stop(this.audioContext.currentTime + 16);
            
            // Add ethereal melody notes
            const melodyNotes = [220, 247, 277, 330, 370]; // A, B, C#, E, F#
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.playMelodyNote(melodyNotes[Math.floor(Math.random() * melodyNotes.length)]);
                }, Math.random() * 12000 + 2000);
            }
            
            // Schedule next loop
            setTimeout(() => {
                if (this.currentMusic) {
                    this.musicLoop();
                }
            }, 16000);
        };
    }

    playMelodyNote(frequency) {
        if (!this.initialized) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const reverb = this.createReverb();
        
        oscillator.connect(reverb);
        reverb.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.musicVolume * 0.15, this.audioContext.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 3);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 3);
    }

    playSound(soundName) {
        if (!this.initialized || this.audioContext.state !== 'running') return;
        
        const soundFunction = this.sounds.get(soundName);
        if (soundFunction) {
            try {
                soundFunction();
            } catch (error) {
                console.warn(`Failed to play sound ${soundName}:`, error);
            }
        }
    }

    startMusic() {
        if (!this.initialized) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.currentMusic = true;
        this.musicLoop();
    }

    stopMusic() {
        this.currentMusic = false;
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
}

// Export for use in main game
window.AudioManager = AudioManager;