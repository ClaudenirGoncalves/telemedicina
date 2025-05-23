/**
 * Aplicação de Telemedicina com WebRTC
 * Este script gerencia a conexão de videochamada entre médico e paciente
 * usando WebRTC nativo para comunicação em tempo real.
 */

// Elementos da interface
let loginContainer;
let callContainer;
let localStream;
let remoteStream;
let joinButton;
let micButton;
let videoButton;
let endCallButton;
let callStatus;
let cpfInput;
let userTypeSelect;

// Variáveis de controle
let localMediaStream = null;
let peerConnection = null;
let dataChannel = null;
let isMuted = false;
let isVideoOff = false;
let isInitiator = false;
let roomId = null;

// Configuração de servidores STUN/TURN para WebRTC
// Servidores STUN públicos para ajudar na descoberta de endereços
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar elementos da interface
    initializeUI();
    
    // Configurar eventos
    setupEventListeners();
});

// Inicializa referências aos elementos da interface
function initializeUI() {
    loginContainer = document.getElementById('login-container');
    callContainer = document.getElementById('call-container');
    localStream = document.getElementById('local-stream');
    remoteStream = document.getElementById('remote-stream');
    joinButton = document.getElementById('join-btn');
    micButton = document.getElementById('mic-btn');
    videoButton = document.getElementById('video-btn');
    endCallButton = document.getElementById('end-call-btn');
    callStatus = document.getElementById('call-status');
    cpfInput = document.getElementById('cpf');
    userTypeSelect = document.getElementById('user-type');
}

// Configura os listeners de eventos
function setupEventListeners() {
    // Botão de entrar na sala
    joinButton.addEventListener('click', joinCall);
    
    // Botão de controle do microfone
    micButton.addEventListener('click', toggleMic);
    
    // Botão de controle da câmera
    videoButton.addEventListener('click', toggleVideo);
    
    // Botão de encerrar chamada
    endCallButton.addEventListener('click', endCall);
    
    // Eventos de conexão WebRTC
    window.addEventListener('beforeunload', endCall);
}

// Função para entrar na chamada
async function joinCall() {
    // Validar CPF
    const cpf = cpfInput.value.replace(/[^\d]/g, '');
    if (!window.validarCPF(cpf)) {
        alert('Por favor, insira um CPF válido.');
        return;
    }
    
    // Gerar ID da sala baseado no CPF (sala privada)
    roomId = `telemedicina_${cpf}`;
    
    // Determinar se é médico ou paciente
    const userType = userTypeSelect.value;
    isInitiator = userType === 'doctor';
    
    try {
        // Solicitar acesso à câmera e microfone
        localMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        
        // Exibir vídeo local
        const videoElement = document.createElement('video');
        videoElement.srcObject = localMediaStream;
        videoElement.autoplay = true;
        videoElement.muted = true; // Mute local video to prevent feedback
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        localStream.innerHTML = '';
        localStream.appendChild(videoElement);
        
        // Iniciar conexão WebRTC
        initializePeerConnection();
        
        // Mostrar interface de chamada
        loginContainer.style.display = 'none';
        callContainer.style.display = 'flex';
        
        // Iniciar sinalização
        setupSignaling();
        
        updateCallStatus(`Conectado à sala como ${userType === 'doctor' ? 'Médico' : 'Paciente'}`);
    } catch (error) {
        console.error('Erro ao acessar mídia:', error);
        alert(`Erro ao acessar câmera ou microfone: ${error.message}`);
    }
}

// Inicializa a conexão WebRTC
function initializePeerConnection() {
    // Criar conexão peer
    peerConnection = new RTCPeerConnection(iceServers);
    
    // Adicionar tracks de áudio e vídeo à conexão
    localMediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localMediaStream);
    });
    
    // Configurar canal de dados para mensagens
    if (isInitiator) {
        dataChannel = peerConnection.createDataChannel('telemedicina');
        setupDataChannel();
    } else {
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannel();
        };
    }
    
    // Lidar com candidatos ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Em uma implementação real, envie este candidato para o outro peer
            // através de um servidor de sinalização
            sendSignalingMessage({
                type: 'ice-candidate',
                candidate: event.candidate
            });
        }
    };
    
    // Lidar com mudanças de estado de conexão
    peerConnection.onconnectionstatechange = () => {
        switch(peerConnection.connectionState) {
            case 'connected':
                updateCallStatus('Conexão estabelecida');
                break;
            case 'disconnected':
            case 'failed':
                updateCallStatus('Conexão perdida');
                break;
            case 'closed':
                updateCallStatus('Conexão encerrada');
                break;
        }
    };
    
    // Lidar com streams remotos
    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            const videoElement = document.createElement('video');
            videoElement.srcObject = event.streams[0];
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'contain';
            remoteStream.innerHTML = '';
            remoteStream.appendChild(videoElement);
            updateCallStatus('Participante conectado');
        }
    };
    
    // Se for o iniciador (médico), criar e enviar oferta
    if (isInitiator) {
        createAndSendOffer();
    }
}

// Configura o canal de dados
function setupDataChannel() {
    if (!dataChannel) return;
    
    dataChannel.onopen = () => {
        console.log('Canal de dados aberto');
    };
    
    dataChannel.onclose = () => {
        console.log('Canal de dados fechado');
    };
    
    dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
    };
}

// Cria e envia uma oferta SDP
async function createAndSendOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Em uma implementação real, envie esta oferta para o outro peer
        // através de um servidor de sinalização
        sendSignalingMessage({
            type: 'offer',
            sdp: peerConnection.localDescription
        });
    } catch (error) {
        console.error('Erro ao criar oferta:', error);
    }
}

// Cria e envia uma resposta SDP
async function createAndSendAnswer() {
    try {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        // Em uma implementação real, envie esta resposta para o outro peer
        // através de um servidor de sinalização
        sendSignalingMessage({
            type: 'answer',
            sdp: peerConnection.localDescription
        });
    } catch (error) {
        console.error('Erro ao criar resposta:', error);
    }
}

// Configura a sinalização WebRTC
// Em uma implementação real, isso seria feito através de um servidor de sinalização
// Para esta demonstração, usamos localStorage para simular a sinalização entre abas do navegador
function setupSignaling() {
    // Limpar mensagens antigas
    localStorage.removeItem(`signaling_${roomId}`);
    
    // Configurar listener para mensagens de sinalização
    window.addEventListener('storage', (event) => {
        if (event.key === `signaling_${roomId}`) {
            const message = JSON.parse(event.newValue);
            handleSignalingMessage(message);
        }
    });
    
    // Se não for o iniciador, enviar mensagem de entrada na sala
    if (!isInitiator) {
        sendSignalingMessage({
            type: 'join',
            userType: 'patient'
        });
    }
}

// Envia mensagem de sinalização
function sendSignalingMessage(message) {
    // Adicionar timestamp e remetente à mensagem
    message.timestamp = Date.now();
    message.sender = isInitiator ? 'doctor' : 'patient';
    message.roomId = roomId;
    
    // Em uma implementação real, envie esta mensagem para um servidor de sinalização
    // Para esta demonstração, usamos localStorage
    localStorage.setItem(`signaling_${roomId}`, JSON.stringify(message));
}

// Processa mensagens de sinalização recebidas
async function handleSignalingMessage(message) {
    // Ignorar mensagens próprias
    if (message.sender === (isInitiator ? 'doctor' : 'patient')) {
        return;
    }
    
    console.log('Mensagem de sinalização recebida:', message);
    
    switch (message.type) {
        case 'join':
            // Se for o iniciador e alguém entrou, enviar oferta
            if (isInitiator) {
                createAndSendOffer();
            }
            break;
            
        case 'offer':
            // Se receber uma oferta, definir descrição remota e enviar resposta
            if (!isInitiator && message.sdp) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
                createAndSendAnswer();
            }
            break;
            
        case 'answer':
            // Se receber uma resposta, definir descrição remota
            if (isInitiator && message.sdp) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
            }
            break;
            
        case 'ice-candidate':
            // Se receber um candidato ICE, adicioná-lo à conexão
            if (message.candidate) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                } catch (error) {
                    console.error('Erro ao adicionar candidato ICE:', error);
                }
            }
            break;
            
        case 'leave':
            // Se o outro participante sair, limpar a interface
            remoteStream.innerHTML = '';
            updateCallStatus('Participante desconectado');
            break;
    }
}

// Alterna o estado do microfone (mudo/ativo)
function toggleMic() {
    if (!localMediaStream) return;
    
    const audioTracks = localMediaStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    if (isMuted) {
        // Ativar microfone
        audioTracks[0].enabled = true;
        micButton.querySelector('.mic-on').style.display = 'inline';
        micButton.querySelector('.mic-off').style.display = 'none';
    } else {
        // Desativar microfone
        audioTracks[0].enabled = false;
        micButton.querySelector('.mic-on').style.display = 'none';
        micButton.querySelector('.mic-off').style.display = 'inline';
    }
    
    isMuted = !isMuted;
}

// Alterna o estado da câmera (ligada/desligada)
function toggleVideo() {
    if (!localMediaStream) return;
    
    const videoTracks = localMediaStream.getVideoTracks();
    if (videoTracks.length === 0) return;
    
    if (isVideoOff) {
        // Ativar câmera
        videoTracks[0].enabled = true;
        videoButton.querySelector('.video-on').style.display = 'inline';
        videoButton.querySelector('.video-off').style.display = 'none';
    } else {
        // Desativar câmera
        videoTracks[0].enabled = false;
        videoButton.querySelector('.video-on').style.display = 'none';
        videoButton.querySelector('.video-off').style.display = 'inline';
    }
    
    isVideoOff = !isVideoOff;
}

// Encerra a chamada e retorna à tela de login
function endCall() {
    // Enviar mensagem de saída
    if (dataChannel && dataChannel.readyState === 'open') {
        sendSignalingMessage({
            type: 'leave'
        });
    }
    
    // Fechar conexão peer
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Parar streams de mídia
    if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
        localMediaStream = null;
    }
    
    // Limpar elementos de vídeo
    localStream.innerHTML = '';
    remoteStream.innerHTML = '';
    
    // Resetar interface
    callContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    
    // Resetar estado
    isMuted = false;
    isVideoOff = false;
    micButton.querySelector('.mic-on').style.display = 'inline';
    micButton.querySelector('.mic-off').style.display = 'none';
    videoButton.querySelector('.video-on').style.display = 'inline';
    videoButton.querySelector('.video-off').style.display = 'none';
    
    updateCallStatus('Aguardando conexão...');
}

// Atualiza o status da chamada na interface
function updateCallStatus(message) {
    callStatus.innerHTML = `<p>${message}</p>`;
}
