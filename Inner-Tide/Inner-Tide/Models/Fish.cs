using System.Text.Json.Serialization;

public class Fish {

    public Fish (string fishId, string sprite, string species, string description, int price, int height, int width, List<FunFact> funFacts) { 
        this.FishId = fishId;
        this.Sprite = sprite;
        this.Species = species;
        this.Description = description;
        this.Price = price;
        this.Height = height;
        this.Width = width;
        this.FunFacts = funFacts;
    }

    [JsonPropertyName("_id")]
    public string FishId { get; set; }

    public string Sprite { get; set; }

    public string Species { get; set; }

    public string Description { get; set; }

    public int Price { get; set; }

    public int Height { get; set; }

    public int Width { get; set; }

    public List<FunFact> FunFacts { get; set; }
}

public class FunFact {
    public string Fact { get; set; }
}
