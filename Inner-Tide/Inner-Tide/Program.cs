using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddIdentity<User, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddHttpClient();
builder.Services.AddSingleton<AquariumProgressLimitSettings>();

builder.Services.AddSession();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var exception = context.Features.Get<IExceptionHandlerPathFeature>()?.Error;
    var errorMessage = exception?.GetBaseException().Message ?? "An unexpected server error occurred.";
    if (context.Request.Headers.Accept.ToString().Contains("text/html", StringComparison.OrdinalIgnoreCase))
    {
        var returnUrl = context.Request.PathBase + context.Request.Path + context.Request.QueryString;
        var refererValue = context.Request.Headers["Referer"].ToString();
        if (Uri.TryCreate(refererValue, UriKind.Absolute, out var referer) &&
            string.Equals(referer.Authority, context.Request.Host.Value, StringComparison.OrdinalIgnoreCase))
        {
            returnUrl = referer.PathAndQuery;
        }

        var query = new QueryString()
            .Add("error", errorMessage)
            .Add("returnUrl", returnUrl);
        context.Response.Redirect($"/error.html{query}");
        return;
    }

    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    context.Response.ContentType = "text/plain";
    await context.Response.WriteAsync(errorMessage);
}));

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapGet("/error.html", async (IWebHostEnvironment environment, HttpContext context) =>
{
    var errorPagePath = Path.Combine(environment.WebRootPath, "error-page.html");
    var errorPage = await File.ReadAllTextAsync(errorPagePath, context.RequestAborted);
    context.Response.Headers.CacheControl = "no-store";
    return Results.Content(errorPage, "text/html; charset=utf-8");
});

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.UseSession();

app.Run();
