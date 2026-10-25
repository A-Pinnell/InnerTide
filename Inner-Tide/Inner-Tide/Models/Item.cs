using System.Text.Json.Serialization;
public class Item {
    public Item(string itemId, string sprite, string name, string description, int price, string gridSpace) {
        ItemId = itemId;
        Sprite = sprite;
        Name = name;
        Description = description;
        Price = price;
        GridSpace = gridSpace;
    }

    [JsonPropertyName("_id")]
    public string ItemId { get; set; }

    public string Sprite { get; set; }

    public string Name { get; set; }

    public string Description { get; set; }

    public int Price { get; set; }

    public string GridSpace { get; set; }
}
