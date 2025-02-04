// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Faucet
 * @dev Хранит имя пользователя, принимает нативный токен, ведёт Top-10 без дублирующихся записей и без заполнения всех слотов одним адресом.
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
     * @param newScore счёт (должен быть больше, чем предыдущий)
     *
     * Логика:
     *  1) Проверяем msg.value >= price и что newScore > старого счёта.
     *  2) Если адрес уже в топе, удаляем его оттуда (сдвигаем элементы),
     *     чтобы не получить дубликатов.
     *  3) Если счёт не выше 10-го места (после удаления), выходим.
     *  4) Вставляем запись в нужную позицию (сортировка по убыванию).
     */
    function submitScore(uint256 newScore) external payable {
        require(msg.value >= price, "Not enough native token");
        require(newScore > scores[msg.sender], "Not an improvement");

        scores[msg.sender] = newScore;

        // 1. Удаляем старую запись, если есть
        for (uint i = 0; i < 10; i++) {
            if (top10[i].player == msg.sender) {
                // Сдвигаем элементы сверху вниз
                for (uint j = i; j < 9; j++) {
                    top10[j] = top10[j + 1];
                }
                // Последнюю ячейку очищаем
                top10[9] = Leader(address(0), 0);
                break;
            }
        }

        // 2. Если теперь newScore <= top10[9].score, значит не попадает в топ
        if (newScore <= top10[9].score) {
            return;
        }

        // 3. Ищем позицию, куда вставить (по убыванию счёта)
        uint pos = 0;
        while (pos < 10 && top10[pos].score >= newScore) {
            pos++;
        }

        // 4. Сдвигаем всех вниз на 1, начиная с 9 до pos+1
        for (uint i = 9; i > pos; i--) {
            top10[i] = top10[i - 1];
        }

        // 5. Вставляем новую запись
        top10[pos] = Leader(msg.sender, newScore);
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
