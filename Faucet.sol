// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Faucet
 * @dev Хранит имя пользователя, принимает нативный токен, ведёт Top-10 с проверкой дубликатов.
 */
contract Faucet {
    /// @dev Структура для хранения адреса и счёта игрока
    struct Leader {
        address player;
        uint256 score;
    }

    /// @dev Массив Top-10
    Leader[10] public top10;

    /// @dev Mapping: адрес => лучший счёт
    mapping(address => uint256) public scores;

    /// @dev Mapping: адрес => имя пользователя
    mapping(address => string) public userNames;

    /// @dev Цена (в wei) за submitScore
    uint256 public price;

    /// @dev Адрес владельца (тот, кто задеплоил)
    address public owner;

    /**
     * @notice В конструкторе задаём цену, owner = deployer
     * @param _price сколько нативных монет нужно отправить при submitScore (wei)
     */
    constructor(uint256 _price) {
        owner = msg.sender;
        price = _price;
    }

    /**
     * @notice Записать имя пользователя в блокчейн
     * @param newName новое имя
     */
    function setUsername(string calldata newName) external {
        userNames[msg.sender] = newName;
    }

    /**
     * @notice Отправить новый счёт, оплатив нативным токеном (msg.value >= price).
     *         Если счёт уже есть в Top-10, просто обновляем. Иначе сравниваем с 10-м местом.
     * @param newScore счёт (должен быть больше, чем предыдущий)
     */
    function submitScore(uint256 newScore) external payable {
        require(msg.value >= price, "Not enough native token");
        require(newScore > scores[msg.sender], "Not an improvement");

        // Обновляем лучший счёт
        scores[msg.sender] = newScore;

        // Проверяем, есть ли уже адрес в Top-10
        bool found = false;
        for (uint i = 0; i < 10; i++) {
            if (top10[i].player == msg.sender) {
                // Если уже есть — просто обновляем
                top10[i].score = newScore;
                found = true;
                break;
            }
        }

        // Если адреса нет в Top-10, проверяем — выше ли он, чем у 10-го места
        if (!found) {
            if (newScore > top10[9].score) {
                // Заменяем десятое место
                top10[9] = Leader(msg.sender, newScore);
            } else {
                // Если счёт не выше — не попадает в топ
                return;
            }
        }

        // "Пузырьковая" сортировка — поднимаем обновлённую запись вверх, если её счёт больше соседнего
        for (uint i = 9; i > 0; i--) {
            if (top10[i].score > top10[i - 1].score) {
                (top10[i], top10[i - 1]) = (top10[i - 1], top10[i]);
            } else {
                break;
            }
        }
    }

    /**
     * @notice Возвращает текущий массив Top-10
     */
    function getTop10() external view returns (Leader[10] memory) {
        return top10;
    }

    /**
     * @notice Позволяет владельцу забрать весь накопленный баланс (нативный токен).
     */
    function withdrawNative(address payable to) external {
        require(msg.sender == owner, "Not owner");
        require(address(this).balance > 0, "No balance");
        to.transfer(address(this).balance);
    }
}
