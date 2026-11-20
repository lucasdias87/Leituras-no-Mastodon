# Leituras no Mastodon
Facilita o compartilhamento de leituras no Mastodon 




Aplicação web leve e de código aberto para acompanhar o progresso dos seus livros e compartilhar suas atualizações de leitura diretamente no Mastodon.

## O que é

O projeto permite registrar suas leituras de forma simples, sem depender de plataformas proprietárias ou algoritmos comerciais. A partir do código ISBN, a ferramenta busca automaticamente a capa e o total de páginas da obra na base colaborativa da Open Library, define o livro como 100% e calcula em tempo real a porcentagem concluída conforme você avança nas páginas.

## Compartilhamento com o Mastodon

Ao atualizar o progresso de um livro, você pode publicar o status da sua leitura diretamente no Mastodon com um clique:

1. Informe o título ou ISBN do livro e o número de páginas lidas.
2. O sistema calcula automaticamente a porcentagem concluída (com opção de ajustar o total de páginas manualmente, caso necessário).
3. Clique na opção de compartilhar no Mastodon, informe o endereço da sua instância (ex.: `mastodon.social`, `bolha.us`, etc.) e publique a postagem pré-formatada com o título do livro, a porcentagem lida e a capa/link da obra.

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla / Fetch API)
- [Open Library API](https://openlibrary.org/developers/api) (dados bibliográficos e capas comunitárias)

## Licença

Este projeto é distribuído sob a licença GPL-3.0.
