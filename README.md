# Cubo Mágico

App para aprender a montar o cubo mágico, direto no navegador:
[codevilelax.github.io/cubo-magico](https://codevilelax.github.io/cubo-magico/)

- **Método por camadas**: os 7 passos, com exemplos para cada caso.
- **CFOP**: cruz, F2L (os 41 casos), OLL e PLL em duas partes (2-look) e completos (57 OLL e 21 PLL).
- **Cubo 3D animado**: mostra cada movimento do algoritmo, com play, pausa, voltar e avançar. Dá para girar o cubo arrastando.
- **Resolver o meu cubo**: você pinta as cores do seu cubo (ou faz um embaralhamento que o app dá) e resolve junto, passo a passo, pelo método por camadas, CFOP 2-look ou CFOP completo. Cada passo explica o que fazer e mostra os movimentos no cubo 3D.
- **Treino de algoritmos**: mostra um caso e você tenta lembrar o algoritmo. Os que você erra aparecem mais.
- **Cronômetro**: embaralhamento de 20 movimentos, melhor tempo e médias de 5 e de 12.

Funciona sem internet e pode ser instalado na tela inicial do celular.

## Como os algoritmos são conferidos

A situação mostrada em cada caso é criada desfazendo o algoritmo num cubo montado, então o desenho sempre bate com o algoritmo. Os testes conferem que cada algoritmo resolve o que promete sem estragar o resto do cubo:

```bash
node testes/verificar.js
node testes/buscar-f2l.js
node testes/resolver.js 1000
```

O último resolve 1000 cubos aleatórios em cada método e confere que todos terminam montados. Ele também testa se pinturas impossíveis (canto torcido, aresta virada, peças trocadas) são recusadas.

## Arquivos

- `js/cubo.js`: o cubo (peças, movimentos e leitura da notação)
- `js/conteudo.js`: textos das aulas e lista de algoritmos
- `js/desenho.js`: desenhos dos casos em SVG
- `js/resolver.js`: lê o cubo pintado e monta a solução passo a passo
- `js/app.js`: telas, cubo 3D, treino e cronômetro
