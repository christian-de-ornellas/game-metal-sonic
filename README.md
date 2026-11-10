# O Mundo de Pedro

Um jogo de plataforma 2D inspirado em Sonic the Hedgehog, desenvolvido do zero com TypeScript e Canvas API.

## Sobre o Jogo

O Mundo de Pedro e um platformer classico com mecanicas de alta velocidade, inimigos, chefes e coleta de aneis. O jogo conta com dois personagens jogaveis, tres fases tematicas e duas batalhas contra chefes.

## Personagens

- **Metal Sonic** - Personagem robotico azul com design metalico. Possui forma super dourada.
- **Pedro Lucas** - Personagem humano com estilo chibi, roupa inspirada no Sonic (camisa azul cobalto, sapatos vermelhos com listras brancas) e oculos de armacao azul.

## Fases

| Fase | Tema | Inimigos |
|------|------|----------|
| Emerald Hill Zone | Colinas verdes, palmeiras e agua | BuzzBomber, Coconuts |
| Chemical Plant Zone | Industria toxica com agua roxa | Grabber, Spiny |
| Casino Night Zone | Neon, bumpers e flippers | Crawl, Flasher |

## Chefes

- **Robo Tinic** - 8 HP, ataques com laser e bombas (10.000 pontos)
- **Bowser** - 12 HP, sopro de fogo, martelos e lava subindo. Mario aparece como aliado (20.000 pontos)

## Mecanicas

- Movimentacao com aceleracao e fisica de plataforma
- Spin Dash com carga (ate 25 unidades/s)
- Forma Super (custa 50 aneis, dura 13 segundos, 2x velocidade)
- Sistema de aneis (100 aneis = 1UP)
- 3 vidas por partida
- Invencibilidade e speed boost
- Efeitos de particulas, transicoes e screen shake

## Controles

### Teclado
- **Setas** - Movimentacao
- **Espaco** - Pulo
- **S** - Spin Dash
- **Esc / P** - Pausar

### Mobile
- D-pad virtual e botoes de acao na tela
- Otimizado para orientacao paisagem

## Tecnologias

- **TypeScript** (ES2020, strict mode)
- **Vite** - Build tool e dev server
- **Canvas 2D** - Renderizacao customizada sem frameworks
- **Web Audio API** - Musica e efeitos sonoros
- **LocalStorage** - Salvamento de progresso

## Como Executar

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Build para producao
pnpm build

# Preview do build
pnpm preview
```

## Estrutura do Projeto

```
src/
├── character/      # Personagens jogaveis (Metal Sonic, Pedro Lucas)
├── boss/           # Chefes e arenas (Robo Tinic, Bowser)
├── level/          # Zonas, terreno e decoracoes
├── enemies/        # Inimigos (Badniks)
├── collectibles/   # Aneis e power-ups
├── camera/         # Sistema de camera 2D
├── core/           # Engine (renderer, input, audio, save, particulas)
├── ui/             # Telas (titulo, selecao, HUD, pause, tutorial)
└── assets/         # Imagens dos personagens
```
