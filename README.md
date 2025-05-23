# Tela de Videochamada para Telemedicina

Esta é uma aplicação web para videochamadas de telemedicina que pode ser incorporada como webview em aplicativos Android, iOS e web.

## Funcionalidades

- Autenticação via CPF para médicos e pacientes
- Sala de videochamada privada baseada no CPF
- Controles para microfone e câmera
- Interface responsiva para todos os dispositivos
- Compatível com webview em aplicativos móveis

## Como usar

### 1. Configuração do Agora.io

Antes de usar esta aplicação, você precisa obter um App ID do Agora.io:

1. Crie uma conta em [https://www.agora.io/](https://www.agora.io/)
2. Crie um novo projeto no console do Agora
3. Copie o App ID gerado
4. Substitua `YOUR_AGORA_APP_ID` no arquivo `js/app.js` pelo seu App ID

### 2. Integração em aplicativos

#### Android

```java
// No seu layout XML
<WebView
    android:id="@+id/webview"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />

// No seu Activity ou Fragment
WebView webView = findViewById(R.id.webview);
WebSettings webSettings = webView.getSettings();
webSettings.setJavaScriptEnabled(true);
webSettings.setDomStorageEnabled(true);
webSettings.setMediaPlaybackRequiresUserGesture(false); // Importante para áudio/vídeo

// Permitir acesso à câmera e microfone
webView.setWebChromeClient(new WebChromeClient() {
    @Override
    public void onPermissionRequest(PermissionRequest request) {
        request.grant(request.getResources());
    }
});

// Carregar a página
webView.loadUrl("file:///android_asset/telemedicina/index.html");
// Ou se estiver hospedado em um servidor:
// webView.loadUrl("https://seu-servidor.com/telemedicina/");
```

#### iOS (Swift)

```swift
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate {
    
    var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Configurar preferências do WebView
        let preferences = WKPreferences()
        preferences.javaScriptEnabled = true
        
        let configuration = WKWebViewConfiguration()
        configuration.preferences = preferences
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // Criar WebView
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)
        
        // Carregar a página
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "telemedicina") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        // Ou se estiver hospedado em um servidor:
        // if let url = URL(string: "https://seu-servidor.com/telemedicina/") {
        //     webView.load(URLRequest(url: url))
        // }
    }
    
    // Lidar com solicitações de permissão
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }
}
```

### 3. Hospedagem

Para usar esta aplicação, você pode:

1. Incluir os arquivos diretamente no seu aplicativo
2. Hospedar em um servidor web e acessar via URL
3. Usar um serviço de hospedagem estática como GitHub Pages, Netlify, etc.

## Personalização

Você pode personalizar a aparência da aplicação editando o arquivo `css/styles.css`. As principais cores e estilos podem ser ajustados para corresponder à identidade visual do seu aplicativo.

## Considerações de Segurança

Em um ambiente de produção, você deve:

1. Implementar um servidor para gerar tokens de autenticação do Agora.io
2. Usar HTTPS para todas as comunicações
3. Implementar uma validação mais robusta de usuários
4. Considerar a criptografia de ponta a ponta para dados sensíveis

## Requisitos Técnicos

- Navegador moderno com suporte a WebRTC
- Permissões de câmera e microfone
- Conexão à internet estável
