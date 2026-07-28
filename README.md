# Quiz Perguntados

Gerador de páginas de perguntas e respostas estilo Perguntados, otimizado para impressão em folha A4 e download de PDF.

## Formato

- A4 (210 × 297 mm), 8 questões por folha (2 colunas × 4 linhas)
- Cada questão contém: categoria, pergunta, 4 alternativas, resposta e explicação
- PDF gerado via html2canvas + jsPDF, pronto para impressão

## Banco de Questões

**576 questões** no total, distribuídas em **12 categorias** com **48 questões cada**:

| Categoria | Fácil | Médio | Difícil |
|---|---|---|---|
| Arte e Cultura | 16 | 16 | 16 |
| Astronomia | 16 | 16 | 16 |
| Gastronomia | 15 | 17 | 16 |
| Tecnologia | 16 | 16 | 16 |
| História | 14 | 16 | 18 |
| Geografia | 16 | 18 | 14 |
| Ciência | 16 | 17 | 15 |
| Música | 13 | 19 | 16 |
| Cinema e TV | 16 | 16 | 16 |
| Esportes | 16 | 16 | 16 |
| Literatura | 16 | 16 | 16 |
| Conhecimentos Gerais | 16 | 16 | 16 |

## Como usar

O banco de questões (`data/questions.json`) é carregado via `fetch`, então **não
dá pra abrir `index.html` direto** (`file://`) — navegadores bloqueiam fetch
local por CORS. Sirva a pasta com qualquer servidor HTTP, por exemplo:

```bash
python3 -m http.server 8000
```

1. Abra `http://localhost:8000/index.html` no navegador
2. Marque/desmarque as categorias desejadas
3. Ajuste o total de questões (distribuição proporcional automática)
4. Clique em **Gerar Páginas** para visualizar
5. Clique em **Imprimir** para abrir o PDF numa nova aba e imprimir direto, ou em **Baixar PDF** para salvar o arquivo A4

Dependências: html2canvas e jsPDF carregados via CDN. Imprimir e Baixar PDF usam o mesmo PDF gerado — a impressão não depende do CSS de paginação do navegador.

A seleção de categorias e o total de questões ficam salvos no `localStorage` do navegador, então voltam a aparecer marcados numa próxima visita.

## Estrutura

- `index.html` — estrutura da página
- `manifest.json` — web app manifest, usado pelo Android/Chrome ao "adicionar à tela inicial"
- `css/style.css` — estilos (tela, impressão e mobile)
- `js/app.js` — lógica de geração de páginas e PDF
- `data/questions.json` — banco de questões, carregado via `fetch`
- `icons/favicon.svg` — ícone da aba do navegador
- `icons/icon-180.png` / `icon-192.png` / `icon-512.png` — ícones para tela inicial (iOS/Android), gerados a partir do `favicon.svg`

## Online

Disponível em: https://pedrorodbit.github.io/quiz/

## Sobre a autoria

Este projeto foi escrito por uma IA (Claude, da Anthropic) em parceria com um
humano — que trouxe a ideia, revisou cada mudança e testou no navegador de
verdade.

Nada aqui foi publicado no escuro: rodou, quebrou, foi consertado e rodou de
novo. Ainda assim, é código da internet — use por sua conta e risco, e abra
uma issue se achar algo torto.

## Licença

MIT — veja [LICENSE](LICENSE). Faça o que quiser, só não me culpe se pegar fogo.
