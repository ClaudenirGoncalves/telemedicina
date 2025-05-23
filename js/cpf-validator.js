/**
 * Validador de CPF
 * Verifica se o CPF inserido é válido e formata a exibição
 */
document.addEventListener('DOMContentLoaded', function() {
    const cpfInput = document.getElementById('cpf');
    
    // Aplicar máscara ao CPF
    cpfInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            value = value.replace(/^(\d{3})(\d)/, '$1.$2');
            value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
        }
        
        e.target.value = value;
    });
    
    // Validar CPF
    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11) return false;
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cpf)) return false;
        
        // Validação do primeiro dígito verificador
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let resto = soma % 11;
        let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
        
        if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;
        
        // Validação do segundo dígito verificador
        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        resto = soma % 11;
        let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
        
        return digitoVerificador2 === parseInt(cpf.charAt(10));
    }
    
    // Exportar função para uso global
    window.validarCPF = validarCPF;
});
