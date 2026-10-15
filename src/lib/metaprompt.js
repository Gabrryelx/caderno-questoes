// Metaprompt exato para IA converter provas no formato aceito pelo importador.
export const METAPROMPT = String.raw`Você é um conversor de provas para JSON. Vou enviar o texto (ou PDF) de uma prova e, se houver, o gabarito. Converta TODAS as questões para o formato abaixo e responda SOMENTE com um único bloco JSON válido, sem nenhum texto antes ou depois e sem comentários.

FORMATO
{
  "groups": [
    {
      "source": "PAS 3 2024",
      "tags": ["prova/pas3-2024"],
      "support": "texto-base compartilhado pelas questões deste grupo (Markdown), ou \"\" se não houver",
      "questions": [
        {
          "n": 11,
          "type": "ce",
          "statement": "enunciado do item (Markdown)",
          "options": [],
          "answer": "C",
          "explanation": "resolução comentada (Markdown)",
          "tags": ["disciplina/assunto"]
        }
      ]
    }
  ]
}

REGRAS
1. Crie um objeto em "groups" para cada texto-base/figura compartilhado por vários itens. Itens sem texto-base vão em um grupo com "support": "". "source", "tags" e "support" do grupo valem para todas as questões dele.
2. "n" = número do item na prova (inteiro). O app monta a fonte como "PAS 3 2024 · Item 11".
3. "type" deve ser exatamente um destes:
   - "ce"    → Certo/Errado (estilo Cebraspe). "options": []. "answer": "C" (certo) ou "E" (errado).
   - "abcd"  → múltipla escolha com 4 alternativas. "options": lista de 4 textos SEM a letra na frente. "answer": "A".."D".
   - "abcde" → múltipla escolha com 5 alternativas. "options": lista de 5 textos SEM a letra. "answer": "A".."E".
   - "num"    → resposta numérica (itens do tipo B). "options": []. "answer": somente o número, com ponto decimal (ex.: "82", "0.25"; "082" vira "82").
4. Item ANULADO (X no gabarito): "annulled": true e "answer": "X".
5. Matemática em LaTeX: $...$ no meio do texto e $$...$$ em linha própria. No JSON, escreva toda barra invertida DUPLICADA (ex.: "\\frac{1}{2}", "\\sqrt{2}").
6. Tabelas em Markdown. Figuras, gráficos e imagens que não possam ser transcritos: descreva entre colchetes, ex.: "[Figura: circuito com bateria de 10 V, resistor R e capacitor C em série]". Se eu fornecer uma URL, use ![descrição](URL).
7. Não invente enunciados nem alternativas: copie fielmente o texto original. Mantenha o idioma original da questão.
8. "explanation": escreva uma resolução curta, correta e COERENTE com o gabarito oficial. Se não tiver segurança, use "".
9. "tags": use #-tags hierárquicas em minúsculas, sem acentos, no formato "disciplina/assunto". Prefira esta taxonomia (crie subníveis novos só se necessário):
   biologia/{bioquimica, citologia, genetica, biotecnologia, origem-da-vida-e-evolucao, histologia-animal, fisiologia-humana, ecologia}
   matematica/{geometria-analitica, geometria-espacial, numeros-complexos, polinomios, matrizes-e-determinantes, sistemas-lineares, analise-combinatoria, probabilidade, porcentagem}
   fisica/{eletrostatica, eletrodinamica, eletromagnetismo, fisica-moderna}
   quimica/{quimica-organica, termoquimica, cinetica-quimica, equilibrio-quimico, eletroquimica, radioatividade}
   geografia/{ordens-mundiais, capitalismo-e-globalizacao, blocos-economicos, geopolitica}
   historia/{1a-guerra-mundial, totalitarismo, crise-de-1929, 2a-guerra-mundial, guerra-fria, historia-do-brasil}
   portugues/{sintaxe, pontuacao, semantica, tipologias-e-generos, vanguardas-europeias, fases-do-modernismo, literatura-contemporanea, interpretacao-de-texto}
   obras/pas3/{audiovisuais, teatro, musicas, literaturas, textos, artes-visuais}  (use quando o item cobrar uma obra da lista do PAS)
   Cada questão deve ter de 1 a 4 tags (além das tags do grupo).
10. Responda com o JSON completo, mesmo que seja longo. Não resuma, não pule itens.

Agora converta a prova a seguir:
[COLE AQUI O TEXTO DA PROVA E O GABARITO]`;
