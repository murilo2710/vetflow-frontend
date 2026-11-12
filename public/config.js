// Configuração em tempo de execução (não precisa rebuild para trocar).
// apiUrl: URL do API Gateway (Azure API Management) que encaminha para o BFF.
window.VETFLOW_CONFIG = {
  apiUrl: 'http://localhost:3000',
  // Cada microfrontend pode ser publicado em outro endereço; basta trocar a URL aqui.
  microfrontends: {
    agenda: './mf/agenda/index.js',
    prontuario: './mf/prontuario/index.js'
  },
  // Links exibidos na aba Arquitetura (preencher depois do deploy)
  links: {
    'Swagger BFF': '',
    'Swagger ms-pets': '',
    'Swagger ms-appointments': '',
    'AsyncAPI (eventos)': '',
    'GitHub': ''
  }
};
