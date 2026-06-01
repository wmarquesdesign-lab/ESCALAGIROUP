CORREÇÃO DA IMPORTAÇÃO

Agora o botão Salvar importação grava a base no IndexedDB do navegador, que aguenta uma base grande melhor que localStorage.

Fluxo correto:
1. Escolha o CSV.
2. Clique em Conferir CSV.
3. O sistema mostra quantas linhas são novas e quantas já existem.
4. Clique em Salvar importação.
5. Aguarde aparecer a mensagem verde de importação salva com sucesso.

Também foi mantida a regra de ignorar duplicados e a busca continua mostrando apenas resultados do código/nome pesquisado.
