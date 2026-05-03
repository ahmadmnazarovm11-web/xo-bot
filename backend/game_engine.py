"""
Логика игры крестики-нолики.
"""
from typing import Optional

WINNING_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),  # строки
    (0, 3, 6), (1, 4, 7), (2, 5, 8),  # столбцы
    (0, 4, 8), (2, 4, 6),              # диагонали
]

# Минимакс для ИИ
def get_ai_move(board: list, ai_symbol: str, human_symbol: str) -> int:
    best_score = -float('inf')
    best_move = -1
    for i in range(9):
        if board[i] is None:
            board[i] = ai_symbol
            score = minimax(board, 0, False, ai_symbol, human_symbol)
            board[i] = None
            if score > best_score:
                best_score = score
                best_move = i
    return best_move


def minimax(board, depth, is_maximizing, ai_symbol, human_symbol):
    winner, _ = check_winner(board)
    if winner == ai_symbol:
        return 10 - depth
    if winner == human_symbol:
        return depth - 10
    if is_draw(board):
        return 0

    if is_maximizing:
        best = -float('inf')
        for i in range(9):
            if board[i] is None:
                board[i] = ai_symbol
                best = max(best, minimax(board, depth + 1, False, ai_symbol, human_symbol))
                board[i] = None
        return best
    else:
        best = float('inf')
        for i in range(9):
            if board[i] is None:
                board[i] = human_symbol
                best = min(best, minimax(board, depth + 1, True, ai_symbol, human_symbol))
                board[i] = None
        return best


def check_winner(board: list) -> tuple[Optional[str], Optional[tuple]]:
    for line in WINNING_LINES:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return board[a], line
    return None, None


def is_draw(board: list) -> bool:
    winner, _ = check_winner(board)
    return all(cell is not None for cell in board) and winner is None
