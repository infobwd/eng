// game.js - ตัวจัดการเกมส์บันชีคำศัพท์

class VocabularyGame {
    constructor() {
        this.currentGrade = 1;
        this.currentWords = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.isFlipped = false;
        this.studyMode = false;
        this.gameStartTime = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeSpeech();
    }

    initializeElements() {
        // Main containers
        this.gradeSelector = document.getElementById('gradeSelector');
        this.gameArea = document.getElementById('gameArea');
        this.results = document.getElementById('results');
        
        // Game elements
        this.flashcard = document.getElementById('flashcard');
        this.word = document.getElementById('word');
        this.wordType = document.getElementById('wordType');
        this.meaning = document.getElementById('meaning');
        this.flipHint = document.getElementById('flipHint');
        
        // Score elements
        this.correctScore = document.getElementById('correctScore');
        this.wrongScore = document.getElementById('wrongScore');
        this.currentCard = document.getElementById('currentCard');
        this.totalCards = document.getElementById('totalCards');
        this.progressFill = document.getElementById('progressFill');
        
        // Control buttons
        this.correctBtn = document.getElementById('correctBtn');
        this.wrongBtn = document.getElementById('wrongBtn');
        this.soundBtn = document.getElementById('soundBtn');
        this.studyModeCheckbox = document.getElementById('studyMode');
        this.restartBtn = document.getElementById('restartBtn');
        this.shareBtn = document.getElementById('shareBtn');
        
        // Result elements
        this.finalScore = document.getElementById('finalScore');
        this.resultMessage = document.getElementById('resultMessage');
        this.finalCorrect = document.getElementById('finalCorrect');
        this.finalWrong = document.getElementById('finalWrong');
        this.finalTotal = document.getElementById('finalTotal');
        
        // Confetti container
        this.confettiContainer = document.getElementById('confettiContainer');
        
        // Word count input
        this.wordCountInput = document.getElementById('wordCount');
    }

    bindEvents() {
        // Grade selection
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectGrade(e));
        });

        // Game controls
        this.flashcard.addEventListener('click', () => this.flipCard());
        this.correctBtn.addEventListener('click', () => this.markAnswer(true));
        this.wrongBtn.addEventListener('click', () => this.markAnswer(false));
        this.soundBtn.addEventListener('click', () => this.speakWord());
        
        // Settings
        this.studyModeCheckbox.addEventListener('change', (e) => {
            this.studyMode = e.target.checked;
            this.updateCard();
        });

        // Navigation
        this.restartBtn.addEventListener('click', () => this.restart());
        this.shareBtn.addEventListener('click', () => this.shareResults());

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Word count input validation
        if (this.wordCountInput) {
            this.wordCountInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (value < 5) e.target.value = 5;
                if (value > 50) e.target.value = 50;
            });
        }
    }

    initializeSpeech() {
        // ตรวจสอบว่าเบราว์เซอร์รองรับ Speech Synthesis หรือไม่
        this.speechSupported = 'speechSynthesis' in window;
        if (this.speechSupported) {
            this.synth = window.speechSynthesis;
        }
    }

    selectGrade(e) {
        // Remove active class from all buttons
        document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('bg-opacity-80'));
        
        // Add active class to selected button
        e.target.classList.add('bg-opacity-80');
        
        this.currentGrade = parseInt(e.target.dataset.grade);
        this.startGame();
    }

    startGame() {
        const words = vocabularyData[this.currentGrade];

        if (!Array.isArray(words)) {
            this.showNotification('❌ ไม่มีข้อมูลคำศัพท์สำหรับระดับชั้นนี้', 'error');
            return;
        }

        // Get word count from input
        const requestedCount = parseInt(this.wordCountInput?.value) || 20;
        const maxWords = Math.min(requestedCount, words.length);
        
        // Shuffle and take only requested number of words
        const shuffledWords = this.shuffleArray([...words]);
        this.currentWords = shuffledWords.slice(0, maxWords);
        
        this.currentIndex = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.isFlipped = false;
        this.gameStartTime = new Date();
        
        // Update total cards display
        if (this.totalCards) {
            this.totalCards.textContent = this.currentWords.length;
        }

        this.gradeSelector.classList.add('hidden');
        this.gameArea.classList.remove('hidden');
        this.results.classList.add('hidden');

        this.updateCard();
        this.updateScore();
        this.updateProgress();

        this.gameArea.classList.add('slide-up');
        
        this.showNotification(`เริ่มเกม ${this.currentWords.length} คำ จากทั้งหมด ${words.length} คำ`, 'info');
    }

    updateCard() {
        if (this.currentIndex >= this.currentWords.length) {
            this.showResults();
            return;
        }

        const currentWord = this.currentWords[this.currentIndex];
        
        // Update card content
        this.word.textContent = currentWord.word;
        this.wordType.textContent = currentWord.type;
        this.meaning.textContent = currentWord.meaning;
        
        // Reset card state
        this.isFlipped = false;
        this.flashcard.classList.remove('card-flipped');
        this.flashcard.classList.add('bounce-in');
        
        // Study mode handling
        if (this.studyMode) {
            this.meaning.classList.remove('hidden');
            this.flipHint.classList.add('hidden');
        } else {
            this.meaning.classList.add('hidden');
            this.flipHint.classList.remove('hidden');
        }

        // Remove animation class after animation completes
        setTimeout(() => {
            this.flashcard.classList.remove('bounce-in');
        }, 600);
    }

    flipCard() {
        if (!this.studyMode && !this.isFlipped) {
            this.meaning.classList.remove('hidden');
            this.flashcard.classList.add('card-flipped', 'flip-animation');
            this.isFlipped = true;
            
            setTimeout(() => {
                this.flashcard.classList.remove('flip-animation');
            }, 600);
        }
    }

    speakWord() {
        if (!this.speechSupported) {
            this.showNotification('เบราว์เซอร์ไม่รองรับการอ่านเสียง', 'error');
            return;
        }

        const currentWord = this.currentWords[this.currentIndex];
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        
        // ตั้งค่าเสียง
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // แสดงการโหลด
        this.soundBtn.innerHTML = '🔄';
        this.soundBtn.classList.add('pulse-animation');
        
        utterance.onend = () => {
            this.soundBtn.innerHTML = '🔊 ฟัง';
            this.soundBtn.classList.remove('pulse-animation');
        };
        
        utterance.onerror = () => {
            this.soundBtn.innerHTML = '🔊 ฟัง';
            this.soundBtn.classList.remove('pulse-animation');
            this.showNotification('เกิดข้อผิดพลาดในการอ่านเสียง', 'error');
        };

        this.synth.speak(utterance);
    }

    markAnswer(isCorrect) {
        const currentWord = this.currentWords[this.currentIndex];
        
        if (isCorrect) {
            this.correctCount++;
            this.showNotification('ถูกต้อง! 🎉', 'success');
            this.correctBtn.classList.add('animate-pulse');
            setTimeout(() => this.correctBtn.classList.remove('animate-pulse'), 500);
        } else {
            this.wrongCount++;
            this.showNotification('ลองใหม่นะ! 💪', 'info');
            this.wrongBtn.classList.add('animate-pulse');
            setTimeout(() => this.wrongBtn.classList.remove('animate-pulse'), 500);
        }
        
        this.updateScore();
        
        // Auto advance after short delay
        setTimeout(() => {
            this.nextCard();
        }, 1000);
    }

    nextCard() {
        this.currentIndex++;
        this.updateCard();
        this.updateProgress();
    }

    updateScore() {
        this.correctScore.textContent = this.correctCount;
        this.wrongScore.textContent = this.wrongCount;
        this.currentCard.textContent = Math.min(this.currentIndex + 1, this.currentWords.length);
        
        if (this.totalCards) {
            this.totalCards.textContent = this.currentWords.length;
        }
    }

    updateProgress() {
        const progress = (this.currentIndex / this.currentWords.length) * 100;
        this.progressFill.style.width = progress + '%';
    }

    showResults() {
        this.gameArea.classList.add('hidden');
        this.results.classList.remove('hidden');
        
        const total = this.correctCount + this.wrongCount;
        const percentage = total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
        const timeSpent = Math.round((new Date() - this.gameStartTime) / 1000);
        
        // Update result display
        this.finalScore.textContent = percentage + '%';
        this.finalCorrect.textContent = this.correctCount;
        this.finalWrong.textContent = this.wrongCount;
        this.finalTotal.textContent = total;
        
        // Set result message
        this.setResultMessage(percentage);
        
        // Show confetti for good scores
        if (percentage >= 80) {
            this.showConfetti();
        }
        
        // Add entrance animation
        this.results.classList.add('slide-up');
    }

    setResultMessage(percentage) {
        let message = '';
        let emoji = '';
        
        if (percentage >= 95) {
            message = 'สุดยอดเลย! คุณเป็นอัจฉริยะ!';
            emoji = '🌟⭐🏆';
        } else if (percentage >= 90) {
            message = 'ยอดเยี่ยมมาก! เก่งจริงๆ!';
            emoji = '🎉🎊👏';
        } else if (percentage >= 80) {
            message = 'เก่งมาก! ทำได้ดีแล้ว!';
            emoji = '👏😊🌈';
        } else if (percentage >= 70) {
            message = 'ดีมาก! ค่อยๆ พัฒนาต่อไป!';
            emoji = '😊💪📚';
        } else if (percentage >= 60) {
            message = 'ดี! ต้องฝึกฝนเพิ่มเติม!';
            emoji = '💪📖🎯';
        } else {
            message = 'ไม่เป็นไร! ลองใหม่และฝึกฝนต่อไป!';
            emoji = '🌱💭🔥';
        }
        
        this.resultMessage.innerHTML = `${emoji}<br>${message}`;
    }

    showConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${Math.random() * 100}vw;
                    animation: fall ${Math.random() * 3 + 2}s linear;
                    z-index: 1000;
                `;
                
                this.confettiContainer.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 5000);
            }, i * 100);
        }
        
        // Add CSS animation if not exists
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.innerHTML = `
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    shareResults() {
        const total = this.correctCount + this.wrongCount;
        const percentage = total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
        const grade = this.currentGrade;
        
        // Check if LIFF is available
        if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
            // Use LIFF share
            this.shareLIFF(percentage, grade);
        } else {
            // Use Web Share API or copy to clipboard
            this.fallbackShare(percentage, grade);
        }
    }

    shareLIFF(percentage, grade) {
        const flexMessage = this.createFlexMessage(percentage, grade, this.correctCount, this.wrongCount);
        
        liff.shareTargetPicker([{
            type: 'flex',
            altText: `ผลคะแนนเกมส์คำศัพท์: ${percentage}%`,
            contents: flexMessage
        }]).then(() => {
            this.showNotification('แชร์ผลสำเร็จ! 🎉', 'success');
        }).catch((err) => {
            console.error('Error sharing:', err);
            this.fallbackShare(percentage, grade);
        });
    }

    createFlexMessage(percentage, grade, correct, wrong) {
        return {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "🎓 ผลคะแนนเกมส์คำศัพท์",
                        weight: "bold",
                        size: "lg",
                        color: "#ffffff"
                    }
                ],
                backgroundColor: "#667eea",
                paddingAll: "15px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `${percentage}%`,
                                size: "3xl",
                                weight: "bold",
                                color: "#667eea",
                                flex: 1,
                                align: "center"
                            }
                        ],
                        margin: "md"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: `ระดับชั้น: ป.${grade}`,
                                size: "sm",
                                color: "#666666",
                                align: "center"
                            },
                            {
                                type: "separator",
                                margin: "md"
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: "✅ ถูก",
                                        size: "sm",
                                        flex: 1,
                                        align: "center"
                                    },
                                    {
                                        type: "text",
                                        text: "❌ ผิด",
                                        size: "sm",
                                        flex: 1,
                                        align: "center"
                                    }
                                ],
                                margin: "md"
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: correct.toString(),
                                        size: "lg",
                                        weight: "bold",
                                        color: "#28a745",
                                        flex: 1,
                                        align: "center"
                                    },
                                    {
                                        type: "text",
                                        text: wrong.toString(),
                                        size: "lg",
                                        weight: "bold",
                                        color: "#dc3545",
                                        flex: 1,
                                        align: "center"
                                    }
                                ]
                            }
                        ],
                        margin: "lg"
                    }
                ],
                spacing: "md",
                paddingAll: "15px"
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "🌟 มาเล่นเกมส์คำศัพท์กันเถอะ!",
                        size: "sm",
                        color: "#666666",
                        align: "center"
                    }
                ],
                paddingAll: "10px"
            }
        };
    }

    fallbackShare(percentage, grade) {
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'ผลคะแนนเกมส์คำศัพท์',
                text: `ฉันได้คะแนน ${percentage}% ในเกมส์คำศัพท์ภาษาอังกฤษ ป.${grade}! 🎉\nถูก ${this.correctCount} คำ ผิด ${this.wrongCount} คำ`,
                url: window.location.href
            }).then(() => {
                this.showNotification('แชร์ผลสำเร็จ! 🎉', 'success');
            }).catch(() => {
                this.copyToClipboard(percentage, grade);
            });
        } else {
            this.copyToClipboard(percentage, grade);
        }
    }

    copyToClipboard(percentage, grade) {
        const text = `🎓 ผลคะแนนเกมส์คำศัพท์ภาษาอังกฤษ ป.${grade}
        
คะแนน: ${percentage}%
ถูก: ${this.correctCount} คำ
ผิด: ${this.wrongCount} คำ

🌟 มาเล่นเกมส์คำศัพท์กันเถอะ!
${window.location.href}`;

        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('คัดลอกข้อความแล้ว! 📋', 'success');
        }).catch(() => {
            this.showNotification('ไม่สามารถแชร์ได้ในขณะนี้', 'error');
        });
    }

    handleKeyboard(e) {
        if (this.gameArea.classList.contains('hidden')) return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.flipCard();
                break;
            case 'ArrowRight':
            case 'Enter':
                e.preventDefault();
                this.markAnswer(true);
                break;
            case 'ArrowLeft':
            case 'Backspace':
                e.preventDefault();
                this.markAnswer(false);
                break;
            case 's':
            case 'S':
                e.preventDefault();
                this.speakWord();
                break;
        }
    }

    showNotification(message, type = 'info') {
        // Use toast element if available
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
            return;
        }
        
        // Fallback to creating notification
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
        
        // Set color based on type
        switch(type) {
            case 'success':
                notification.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                notification.classList.add('bg-red-500', 'text-white');
                break;
            case 'info':
            default:
                notification.classList.add('bg-blue-500', 'text-white');
                break;
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Hide notification
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    restart() {
        // Reset UI
        this.gradeSelector.classList.remove('hidden');
        this.gameArea.classList.add('hidden');
        this.results.classList.add('hidden');
        
        // Remove active class from all grade buttons
        document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('bg-opacity-80'));
        
        // Clear confetti
        this.confettiContainer.innerHTML = '';
        
        // Add entrance animation
        this.gradeSelector.classList.add('slide-up');
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

// เริ่มต้นเกมเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    const game = new VocabularyGame();
    console.log('🎮 เกมส์บันชีคำศัพท์พร้อมใช้งาน!');
    
    // Optional: Add service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker registration failed (ignore)
        });
    }
});
