using Smn.UiKit.Web.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ViteManifestReader>();

builder.Services.AddControllersWithViews()
    .AddRazorOptions(options =>
    {
        options.ViewLocationExpanders.Add(new FeatureViewLocationExpander());
    });

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/erro");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => Results.Redirect("/ui-kit"));

app.Run();
