// Conteúdo das aulas e lista de algoritmos.
// Cada caso tem um algoritmo. A situação mostrada no cubo é criada desfazendo
// o algoritmo num cubo montado (ou em "base", quando informado). Assim o desenho
// sempre bate com o algoritmo. "inicio" troca isso por um começo fixo.
// Máscaras (o que aparece colorido): tudo, cruz, camada1, f2l, oll,
// arestasOll, arestasLL, cantosLL.
(function (raiz) {
  'use strict';

  const SEXY = "R U R' U'";
  const repetir = (alg, n) => Array(n).fill(alg).join(' ');

  // ---------- Notação ----------
  const notacao = [
    { alg: 'R', texto: 'Face da direita, no sentido horário (olhando para ela).' },
    { alg: "R'", texto: 'Face da direita, no sentido anti-horário. O apóstrofo inverte o sentido.' },
    { alg: 'R2', texto: 'Face da direita, meia volta (dois giros). Tanto faz o sentido.' },
    { alg: 'L', texto: 'Face da esquerda, no sentido horário olhando para ela.' },
    { alg: 'U', texto: 'Face de cima (up), no sentido horário.' },
    { alg: 'D', texto: 'Face de baixo (down), no sentido horário olhando por baixo.' },
    { alg: 'F', texto: 'Face da frente (front), no sentido horário.' },
    { alg: 'B', texto: 'Face de trás (back), no sentido horário olhando por trás.' },
    { alg: 'M', texto: 'Camada do meio, entre L e R, girando igual ao L.' },
    { alg: 'r', texto: 'Letra minúscula: duas camadas juntas (a face R e a do meio). Também se escreve Rw.' },
    { alg: 'x', texto: 'Gira o cubo inteiro, igual ao R. Nenhuma peça muda de lugar.' },
    { alg: 'y', texto: 'Gira o cubo inteiro, igual ao U.' },
  ];

  // ---------- Método por camadas ----------
  const camadas = [
    {
      id: 'cruz',
      titulo: 'Cruz branca',
      objetivo: 'Montar uma cruz branca na face de baixo, com cada aresta combinando com o centro do lado.',
      texto: [
        'Segure o cubo com o centro branco para baixo. As peças da cruz são as 4 arestas que têm branco: branco-verde, branco-laranja, branco-azul e branco-vermelho.',
        'Aqui não tem algoritmo para decorar. Você leva cada aresta até o lugar dela, uma de cada vez. A aresta branco-verde fica entre o centro branco e o centro verde, e assim por diante.',
        'Os centros nunca saem do lugar. Por isso são eles que mostram onde cada peça deve ficar.',
      ],
      mascara: 'cruz',
      casos: [
        { nome: 'Branco para cima', alg: 'U F2', texto: 'A aresta está em cima, com o branco para cima. Gire a face de cima até ela ficar sobre o centro da outra cor dela e faça F2.' },
        { nome: 'Branco para a frente', alg: "U' R' F R", texto: 'A aresta está em cima, na frente, sobre o centro da outra cor dela, mas com o branco virado para você.' },
        { nome: 'Aresta no meio', alg: 'F', texto: 'A aresta está na camada do meio e a cor da frente já combina com o centro. Gire a frente para descer a aresta.' },
      ],
      dica: 'Se uma aresta branca estiver embaixo no lugar errado ou virada, faça F2 (com ela na frente) para levar ela para cima e caia num dos casos acima.',
    },
    {
      id: 'cantos-brancos',
      titulo: 'Cantos brancos',
      objetivo: 'Completar a face branca com os 4 cantos, e cada canto combinando com os centros dos lados.',
      texto: [
        'Ache um canto com branco na camada de cima. Gire a face de cima até ele ficar logo acima do lugar dele, entre os centros das duas outras cores do canto.',
        'Segure o cubo com esse canto na frente, à direita, em cima. Repita R U R\' U\' até o canto descer certo. Pode precisar de 1, 3 ou 5 vezes.',
        'Esse algoritmo nunca estraga a cruz, por isso você pode repetir quantas vezes precisar.',
      ],
      algoritmo: SEXY,
      mascara: 'camada1',
      casos: [
        { nome: 'Branco para a direita', alg: SEXY, texto: 'Uma vez.' },
        { nome: 'Branco para cima', alg: repetir(SEXY, 3), texto: 'Três vezes.' },
        { nome: 'Branco para a frente', alg: repetir(SEXY, 5), texto: 'Cinco vezes.' },
      ],
      dica: 'Se um canto branco estiver embaixo no lugar errado, segure ele na frente à direita e faça R U R\' U\' uma vez para tirar ele de lá.',
    },
    {
      id: 'segunda-camada',
      titulo: 'Segunda camada',
      objetivo: 'Colocar as 4 arestas da camada do meio (as que não têm amarelo).',
      texto: [
        'Continue com o branco embaixo. Ache uma aresta na camada de cima que não tenha amarelo.',
        'Gire a face de cima até a cor da frente da aresta combinar com o centro da frente. Fica um T de cabeça para baixo.',
        'Olhe a cor de cima da aresta. Se ela combinar com o centro da direita, faça o algoritmo para a direita. Se combinar com o da esquerda, o para a esquerda.',
      ],
      mascara: 'f2l',
      casos: [
        { nome: 'Para a direita', alg: "U R U' R' U' F' U F", texto: 'A aresta desce para o meio, à direita.' },
        { nome: 'Para a esquerda', alg: "U' L' U L U F U' F'", texto: 'A aresta desce para o meio, à esquerda.' },
      ],
      dica: 'Se uma aresta estiver no meio, mas no lugar errado ou invertida, faça o algoritmo para a direita com qualquer aresta amarela na frente. Isso tira a aresta de lá, e aí ela vira um caso normal.',
    },
    {
      id: 'cruz-amarela',
      titulo: 'Cruz amarela',
      objetivo: 'Formar uma cruz amarela na face de cima. Os cantos ainda não importam.',
      texto: [
        'Agora o amarelo fica em cima. Olhe só as arestas da face de cima e veja qual destes desenhos aparece: um ponto, um L ou uma linha.',
        'O algoritmo é sempre o mesmo. O que muda é como você segura o cubo antes de fazer.',
      ],
      algoritmo: "F R U R' U' F'",
      mascara: 'arestasOll',
      casos: [
        { nome: 'Ponto', alg: "F R U R' U' F' U2 F R U R' U' F' F R U R' U' F'", base: "R U R' U R U2 R'", texto: 'Faça o algoritmo de qualquer jeito: vira um L. Gire a face de cima até o L ficar atrás e à esquerda (aqui foi U2) e siga como no caso do L.' },
        { nome: 'L', alg: "F R U R' U' F' F R U R' U' F'", base: "R U R' U R U2 R'", texto: 'Segure com o L atrás e à esquerda, como os ponteiros às 9h. Faça o algoritmo: vira uma linha deitada. Faça de novo e vira a cruz.' },
        { nome: 'Linha', alg: "F R U R' U' F'", base: "R U R' U R U2 R'", texto: 'Segure com a linha deitada (da esquerda para a direita) e faça o algoritmo.' },
      ],
    },
    {
      id: 'arestas-amarelas',
      titulo: 'Arestas amarelas no lugar',
      objetivo: 'Fazer cada aresta da cruz amarela combinar com o centro do lado.',
      texto: [
        'Gire a face de cima até duas arestas combinarem com os centros dos lados.',
        'Se as duas certas forem vizinhas, segure o cubo com elas atrás e à direita e faça o algoritmo.',
        'Se forem opostas (uma na frente e outra atrás), faça o algoritmo uma vez de qualquer jeito. Aí elas ficam vizinhas e você repete.',
      ],
      algoritmo: "R U R' U R U2 R' U",
      mascara: 'arestasLL',
      casos: [
        { nome: 'Vizinhas certas', alg: "R U R' U R U2 R' U", base: "U R U' L' U R' U' L", texto: 'As certas estão atrás e à direita.' },
      ],
    },
    {
      id: 'cantos-lugar',
      titulo: 'Cantos amarelos no lugar',
      objetivo: 'Pôr cada canto amarelo no lugar certo, mesmo que ainda esteja virado.',
      texto: [
        'Um canto está no lugar certo quando tem as mesmas cores dos três centros em volta dele, mesmo virado.',
        'Ache um canto no lugar certo e segure o cubo com ele na frente, à direita, em cima. Faça o algoritmo e confira. Repita até os quatro estarem no lugar.',
        'Se nenhum estiver no lugar, faça o algoritmo uma vez de qualquer posição. Aí um deles fica certo.',
      ],
      algoritmo: "U R U' L' U R' U' L",
      mascara: 'tudo',
      casos: [
        { nome: 'Uma vez', alg: "U R U' L' U R' U' L", base: "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'", texto: 'O canto da frente à direita já está no lugar.' },
        { nome: 'Duas vezes', alg: "U R U' L' U R' U' L U R U' L' U R' U' L", base: "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'", texto: 'O canto da frente à direita já está no lugar. Depois da primeira vez, confira e repita.' },
      ],
    },
    {
      id: 'virar-cantos',
      titulo: 'Virar os cantos amarelos',
      objetivo: 'Deixar a face de cima toda amarela e terminar o cubo.',
      texto: [
        'Segure com o amarelo em cima e um canto ainda virado na frente, à direita. Repita R\' D\' R D até o amarelo desse canto ficar para cima (2 ou 4 vezes).',
        'As camadas de baixo vão bagunçar. Não se assuste e não vire o cubo: elas voltam sozinhas no fim.',
        'Agora gire só a face de cima (U) para trazer o próximo canto virado para a frente à direita e repita. Quando todos estiverem amarelos, gire a face de cima até tudo combinar.',
      ],
      algoritmo: "R' D' R D",
      mascara: 'tudo',
      casos: [
        { nome: 'Dois cantos virados', alg: "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'", texto: 'O primeiro canto precisa de 2 vezes, o segundo de 4.' },
      ],
    },
  ];

  // ---------- CFOP ----------
  const cruzCfop = {
    texto: [
      'É a mesma cruz do método por camadas, mas feita direto na face de baixo, sem virar o cubo.',
      'Use os 15 segundos de inspeção para planejar a cruz inteira antes de começar. Uma boa cruz sai em até 8 movimentos.',
      'Treine fazer a cruz sem olhar muito para ela. Isso deixa você procurar as peças do F2L enquanto termina a cruz.',
    ],
  };

  const f2lIntro = {
    texto: [
      'No F2L (primeiras duas camadas) você junta o canto branco com a aresta do meio dele e encaixa os dois de uma vez. Isso troca os passos 2 e 3 do método por camadas por um só.',
      'Dá para resolver quase tudo entendendo a ideia, sem decorar. Os 4 casos básicos abaixo são a base de todos os outros: o resto é só levar canto e aresta até um desses jeitos.',
      'Os casos abaixo encaixam o par na frente à direita. Para outros lugares, gire o cubo (y) e use o mesmo algoritmo.',
    ],
    basicos: [
      { nome: 'Par pronto, entra pela direita', alg: "U R U' R'" },
      { nome: 'Par pronto, entra pela frente', alg: "U' F' U F" },
      { nome: 'Encaixe direto pela direita', alg: "R U R'" },
      { nome: 'Encaixe direto pela frente', alg: "F' U' F" },
    ],
  };

  const f2l = [
    "U R U' R'", "U' F' U F", "F' U' F", "R U R'",
    "U' R U R' U2 R U' R'", "U F' U' F U2 F' U F", "U' R U2 R' U2 R U' R'", "U F' U2 F U2 F' U F",
    "U' R U' R' U F' U' F", "U' R U R' U R U R'", "U' R U2 R' U F' U' F", "R U' R' U R U' R' U2 R U' R'",
    "U F' U F U' F' U' F", "U' R U' R' U R U R'", "R' D' R U' R' D R U R U' R'", "R U' R' U2 F' U' F",
    "R U2 R' U' R U R'", "F' U2 F U F' U' F", "U R U2 R' U R U' R'", "U' F' U2 F U' F' U F",
    "U2 R U R' U R U' R'", "U2 F' U' F U' F' U F", "U R U' R' U' R U' R' U R U' R'", "F U R U' R' F' R U' R'",
    // canto no lugar, aresta em cima
    "U' R' F R F' R U R'", "U R U' R' F R' F' R", "R U' R' U R U' R'", "R U R' U' F R' F' R",
    "U F' U F R U R'", "F' U' F U F' U' F",
    // aresta no lugar, canto em cima
    "R U R' U' R U R' U' R U R'", "U' R' F R F' R U' R'", "U' R U' R' U2 R U' R'", "U R U R' U2 R U R'",
    "U2 R U' R' U' F' U' F", "U F' U' F U' R U R'",
    // os dois no lugar
    "R' F R F' R U' R' U R U' R' U2 R U' R'", "R U' R' U' R U R' U2 R U' R'", "R U' R' U R U2 R' U R U' R'",
    "R U' R' F R U R' U' F' R U' R'", "R U F R U R' U' F' R'",
  ];

  // OLL em duas partes
  const oll2Arestas = [
    { nome: 'Linha', alg: "F R U R' U' F'", base: "R U2 R' U' R U' R'", texto: 'Segure com a linha deitada.' },
    { nome: 'L', alg: "F U R U' R' F'", base: "R U2 R' U' R U' R'", texto: 'Segure com o L atrás e à esquerda, igual ao método por camadas. Vira cruz direto.' },
    { nome: 'Ponto', alg: "F R U R' U' F' f R U R' U' f'", base: "R U2 R' U' R U' R'", texto: 'A primeira metade transforma o ponto num L na frente e à direita. A segunda metade (com f minúsculo) resolve esse L.' },
  ];

  // Os 7 casos de cantos são as OLL 21 a 27, que estão na lista completa.
  const oll2Cantos = [27, 26, 21, 22, 23, 24, 25];

  // PLL em duas partes
  const pll2Cantos = [
    { nome: 'Faróis', alg: "R U R' U' R' F R2 U' R' U' R U R' F'", texto: 'Dois cantos vizinhos da mesma cor num lado ("faróis"). Segure os faróis à esquerda. É o T-perm.' },
    { nome: 'Diagonal', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", texto: 'Nenhum lado com faróis: os cantos trocam na diagonal. É o Y-perm.' },
  ];
  const pll2Arestas = ['Ua', 'Ub', 'H', 'Z'];

  // OLL completa: [número, grupo, algoritmo]
  const oll = [
    [1, 'Ponto', "R U2 R2 F R F' U2 R' F R F'"],
    [2, 'Ponto', "F R U R' U' F' f R U R' U' f'"],
    [3, 'Ponto', "f R U R' U' f' U' F R U R' U' F'"],
    [4, 'Ponto', "f R U R' U' f' U F R U R' U' F'"],
    [5, 'Quadrado', "r' U2 R U R' U r"],
    [6, 'Quadrado', "r U2 R' U' R U' r'"],
    [7, 'Raio pequeno', "r U R' U R U2 r'"],
    [8, 'Raio pequeno', "l' U' L U' L' U2 l"],
    [9, 'Peixe', "R U R' U' R' F R2 U R' U' F'"],
    [10, 'Peixe', "R U R' U R' F R F' R U2 R'"],
    [11, 'Raio pequeno', "r U R' U R' F R F' R U2 r'"],
    [12, 'Raio pequeno', "M' R' U' R U' R' U2 R U' R r'"],
    [13, 'Cavalo', "F U R U' R2 F' R U R U' R'"],
    [14, 'Cavalo', "R' F R U R' F' R F U' F'"],
    [15, 'Cavalo', "l' U' l L' U' L U l' U l"],
    [16, 'Cavalo', "r U r' R U R' U' r U' r'"],
    [17, 'Ponto', "R U R' U R' F R F' U2 R' F R F'"],
    [18, 'Ponto', "r U R' U R U2 r2 U' R U' R' U2 r"],
    [19, 'Ponto', "r' R U R U R' U' M' R' F R F'"],
    [20, 'Ponto', "r U R' U' M2 U R U' R' U' M'"],
    [21, 'Cruz (H)', "R U2 R' U' R U R' U' R U' R'"],
    [22, 'Cruz (Pi)', "R U2 R2 U' R2 U' R2 U2 R"],
    [23, 'Cruz (faróis)', "R2 D' R U2 R' D R U2 R"],
    [24, 'Cruz (T)', "r U R' U' r' F R F'"],
    [25, 'Cruz (gravata)', "F' r U R' U' r' F R"],
    [26, 'Cruz (Antisune)', "R U2 R' U' R U' R'"],
    [27, 'Cruz (Sune)', "R U R' U R U2 R'"],
    [28, 'Cantos certos', "r U R' U' r' R U R U' R'"],
    [29, 'Estranho', "R U R' U' R U' R' F' U' F R U R'"],
    [30, 'Estranho', "F R' F R2 U' R' U' R U R' F2"],
    [31, 'P', "R' U' F U R U' R' F' R"],
    [32, 'P', "L U F' U' L' U L F L'"],
    [33, 'T', "R U R' U' R' F R F'"],
    [34, 'C', "R U R2 U' R' F R U R U' F'"],
    [35, 'Peixe', "R U2 R2 F R F' R U2 R'"],
    [36, 'W', "L' U' L U' L' U L U L F' L' F"],
    [37, 'Peixe', "F R' F' R U R U' R'"],
    [38, 'W', "R U R' U R U' R' U' R' F R F'"],
    [39, 'Raio grande', "L F' L' U' L U F U' L'"],
    [40, 'Raio grande', "R' F R U R' U' F' U R"],
    [41, 'Estranho', "R U R' U R U2 R' F R U R' U' F'"],
    [42, 'Estranho', "R' U' R U' R' U2 R F R U R' U' F'"],
    [43, 'P', "F' U' L' U L F"],
    [44, 'P', "F U R U' R' F'"],
    [45, 'T', "F R U R' U' F'"],
    [46, 'C', "R' U' R' F R F' U R"],
    [47, 'L pequeno', "R' U' R' F R F' R' F R F' U R"],
    [48, 'L pequeno', "F R U R' U' R U R' U' F'"],
    [49, 'L pequeno', "r U' r2 U r2 U r2 U' r"],
    [50, 'L pequeno', "r' U r2 U' r2 U' r2 U r'"],
    [51, 'Linha', "F U R U' R' U R U' R' F'"],
    [52, 'Linha', "R U R' U R U' B U' B' R'"],
    [53, 'L pequeno', "l' U2 L U L' U' L U L' U l"],
    [54, 'L pequeno', "r U2 R' U' R U R' U' R U' r'"],
    [55, 'Linha', "R' F R U R U' R2 F' R2 U' R' U R U R'"],
    [56, 'Linha', "r' U' r U' R' U R U' R' U R r' U r"],
    [57, 'Cantos certos', "R U R' U' M' U R U' r'"],
  ];

  // PLL completa: [nome, grupo, algoritmo]
  const pll = [
    ['Aa', 'Só cantos', "x R' U R' D2 R U' R' D2 R2 x'"],
    ['Ab', 'Só cantos', "x R2 D2 R U R' D2 R U' R x'"],
    ['E', 'Só cantos', "x' R U' R' D R U R' D' R U R' D R U' R' D' x"],
    ['Ua', 'Só arestas', "M2 U M U2 M' U M2"],
    ['Ub', 'Só arestas', "M2 U' M U2 M' U' M2"],
    ['H', 'Só arestas', "M2 U M2 U2 M2 U M2"],
    ['Z', 'Só arestas', "M' U M2 U M2 U M' U2 M2 U'"],
    ['T', 'Troca de vizinhos', "R U R' U' R' F R2 U' R' U' R U R' F'"],
    ['F', 'Troca de vizinhos', "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R"],
    ['Ja', 'Troca de vizinhos', "x R2 F R F' R U2 r' U r U2 x'"],
    ['Jb', 'Troca de vizinhos', "R U R' F' R U R' U' R' F R2 U' R' U'"],
    ['Ra', 'Troca de vizinhos', "R U' R' U' R U R D R' U' R D' R' U2 R' U'"],
    ['Rb', 'Troca de vizinhos', "R2 F R U R U' R' F' R U2 R' U2 R U"],
    ['V', 'Troca na diagonal', "R' U R' U' y R' F' R2 U' R' U R' F R F"],
    ['Y', 'Troca na diagonal', "F R U' R' U' R U R' F' R U R' U' R' F R F'"],
    ['Na', 'Troca na diagonal', "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'"],
    ['Nb', 'Troca na diagonal', "R' U R U' R' F' U' F R U R' F R' F' R U' R"],
    ['Ga', 'G', "R2 U R' U R' U' R U' R2 U' D R' U R D' U'"],
    ['Gb', 'G', "R' U' R U D' R2 U R' U R U' R U' R2 D U'"],
    ['Gc', 'G', "R2 U' R U' R U R' U R2 U D' R U' R' D U'"],
    ['Gd', 'G', "R U R' U' D R2 U' R U' R' U R' U R2 D' U'"],
  ];

  const Conteudo = {
    notacao, camadas, cruzCfop, f2lIntro, f2l,
    oll2Arestas, oll2Cantos, pll2Cantos, pll2Arestas,
    oll: oll.map(([n, grupo, alg]) => ({ id: 'oll' + n, nome: 'OLL ' + n, numero: n, grupo, alg, mascara: 'oll' })),
    pll: pll.map(([nome, grupo, alg]) => ({ id: 'pll-' + nome, nome: nome + '-perm', curto: nome, grupo, alg, mascara: 'tudo' })),
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Conteudo;
  else raiz.Conteudo = Conteudo;
})(typeof window !== 'undefined' ? window : globalThis);
